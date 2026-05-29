import ccxt
import pandas as pd
import numpy as np
import time
from datetime import datetime, timedelta
import pandas_ta as ta

# ---- 1. Strategy Configuration & Constants ----
CAPITAL_INR = 100_000.0  # 1 Lakh INR
LEVERAGE = 3
RISK_PER_TRADE_PCT = 0.02 # 2% of capital per trade = 2000 INR risk per trade
FEE_PCT = 0.001 # 0.1% round-trip fees
INR_PER_USD = 84.0

# Strict Risk/Reward settings
RR_RATIO = 2.5 # We risk Rs.2000 to make Rs.5000 (Hits your target with just 1 win)

# Coin Universe - 25 High Performing Coins
SYMBOLS = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
    'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT',
    'MATIC/USDT', 'LTC/USDT', 'BCH/USDT', 'UNI/USDT', 'ATOM/USDT',
    'ETC/USDT', 'FIL/USDT', 'NEAR/USDT', 'APT/USDT', 'OP/USDT',
    'ARB/USDT', 'INJ/USDT', 'RNDR/USDT', 'ZEC/USDT', 'PAXG/USDT'
]

print("Mind Power Vaultt: High Accuracy Strategy (V2) Constants Initialized.")

# ---- 2. Data Fetching Engine ----
def get_exchange():
    return ccxt.binance({
        'enableRateLimit': True,
        'options': {'defaultType': 'future'}
    })

def fetch_data(symbol, timeframe, limit=1000):
    try:
        exchange = get_exchange()
        all_ohlcv = []
        since = None
        while len(all_ohlcv) < limit:
            fetch_limit = min(limit - len(all_ohlcv), 1000)
            ohlcv = exchange.fetch_ohlcv(symbol, timeframe, since=since, limit=fetch_limit)
            if not ohlcv:
                break
            all_ohlcv.extend(ohlcv)
            since = ohlcv[-1][0] + 1
            time.sleep(exchange.rateLimit / 1000)

        if not all_ohlcv: return None

        df = pd.DataFrame(all_ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        df.set_index('timestamp', inplace=True)
        return df
    except Exception as e:
        print(f"Error fetching {symbol} on {timeframe}: {e}")
        return None

def prepare_data(symbols, limit_ltf=2000):
    print(f"Fetching live historical data for {len(symbols)} coins from Binance Futures...")
    data_cache = {}
    limit_htf = max(limit_ltf // 4, 100)
    for symbol in symbols:
        df_15m = fetch_data(symbol, '15m', limit=limit_ltf)
        df_1h = fetch_data(symbol, '1h', limit=limit_htf)
        if df_15m is not None and df_1h is not None:
            data_cache[symbol] = {'15m': df_15m, '1h': df_1h}
        time.sleep(0.1)
    return data_cache

# ---- 3. Multi-Timeframe Strategy Logic (V2 - Strict) ----
def calculate_indicators(df, is_htf=False):
    df = df.copy()
    if is_htf:
        # HTF Trend is sacred
        df['ema_50'] = ta.ema(df['close'], length=50)
        df['ema_200'] = ta.ema(df['close'], length=200)
        st_htf = ta.supertrend(df['high'], df['low'], df['close'], length=10, multiplier=3.0)
        df['st_dir_htf'] = st_htf['SUPERTd_10_3.0'] if st_htf is not None else np.nan
    else:
        # LTF for precise entry
        st_ltf = ta.supertrend(df['high'], df['low'], df['close'], length=10, multiplier=2.5)
        df['st_dir_ltf'] = st_ltf['SUPERTd_10_2.5'] if st_ltf is not None else np.nan
        df['st_val_ltf'] = st_ltf['SUPERT_10_2.5'] if st_ltf is not None else np.nan

        # Stricter ADX to kill chop trades
        adx = ta.adx(df['high'], df['low'], df['close'], length=14)
        df['adx'] = adx['ADX_14'] if adx is not None else np.nan

        # RSI to prevent buying tops / shorting bottoms
        df['rsi'] = ta.rsi(df['close'], length=14)

        # ATR for dynamic, fixed stop loss calculation
        df['atr'] = ta.atr(df['high'], df['low'], df['close'], length=14)
    return df

def align_htf_to_ltf(df_ltf, df_htf):
    df_ltf = df_ltf.copy()
    # CRITICAL FIX: Shift HTF by 1 to prevent lookahead bias
    df_htf = df_htf[['ema_50', 'ema_200', 'st_dir_htf']].shift(1).add_suffix('_1h')
    merged = df_ltf.join(df_htf, how='left')
    merged.ffill(inplace=True)
    return merged

def generate_signals(df):
    df['signal'] = 0
    df['signal_price'] = np.nan
    df['sl_price'] = np.nan
    df['tp_price'] = np.nan

    df['prev_st_dir_ltf'] = df['st_dir_ltf'].shift(1)

    for i in range(1, len(df)):
        if pd.isna(df['adx'].iloc[i]) or pd.isna(df['st_dir_htf_1h'].iloc[i]) or pd.isna(df['atr'].iloc[i]): continue

        # V2 Filters:
        # 1. ADX > 25 (Must be a strong trend)
        adx_strong = df['adx'].iloc[i] > 25

        # 2. RSI Checks (Don't long if overbought > 70, don't short if oversold < 30)
        rsi = df['rsi'].iloc[i]

        # 3. HTF Trend Alignment
        htf_bullish = df['st_dir_htf_1h'].iloc[i] == 1 and df['ema_50_1h'].iloc[i] > df['ema_200_1h'].iloc[i]
        htf_bearish = df['st_dir_htf_1h'].iloc[i] == -1 and df['ema_50_1h'].iloc[i] < df['ema_200_1h'].iloc[i]

        # Trigger
        flip_long = (df['st_dir_ltf'].iloc[i] == 1) and (df['prev_st_dir_ltf'].iloc[i] == -1)
        flip_short = (df['st_dir_ltf'].iloc[i] == -1) and (df['prev_st_dir_ltf'].iloc[i] == 1)

        close_price = df['close'].iloc[i]
        atr_val = df['atr'].iloc[i]

        # Fixed 2x ATR Stop Loss, which allows breathing room
        sl_distance = atr_val * 2.0
        tp_distance = sl_distance * RR_RATIO

        if flip_long and adx_strong and htf_bullish and rsi < 70:
            df.iat[i, df.columns.get_loc('signal')] = 1
            df.iat[i, df.columns.get_loc('signal_price')] = close_price
            df.iat[i, df.columns.get_loc('sl_price')] = close_price - sl_distance
            df.iat[i, df.columns.get_loc('tp_price')] = close_price + tp_distance

        elif flip_short and adx_strong and htf_bearish and rsi > 30:
            df.iat[i, df.columns.get_loc('signal')] = -1
            df.iat[i, df.columns.get_loc('signal_price')] = close_price
            df.iat[i, df.columns.get_loc('sl_price')] = close_price + sl_distance
            df.iat[i, df.columns.get_loc('tp_price')] = close_price - tp_distance

    return df

# ---- 4. Backtester Engine (Fixed Target Version) ----
def run_backtest(df_signals, symbol):
    trades = []
    position = 0
    entry_price = 0
    sl_price = 0
    tp_price = 0
    pos_size_usd = 0
    entry_time = None

    for i in range(1, len(df_signals)):
        row = df_signals.iloc[i]

        # --- Check for Exits if in position ---
        if position != 0:
            # We use High/Low of the candle to see if SL or TP was hit intrabar
            hit_sl_long = position == 1 and row['low'] <= sl_price
            hit_tp_long = position == 1 and row['high'] >= tp_price

            hit_sl_short = position == -1 and row['high'] >= sl_price
            hit_tp_short = position == -1 and row['low'] <= tp_price

            # If both hit in same bar, we assume the worst (SL hit first) for conservative backtesting
            if hit_sl_long or hit_sl_short:
                exit_price = sl_price
                exit_reason = 'Stop Loss'
                net_pnl_inr = -((CAPITAL_INR * RISK_PER_TRADE_PCT) + (pos_size_usd * FEE_PCT * 2 * INR_PER_USD))

            elif hit_tp_long or hit_tp_short:
                exit_price = tp_price
                exit_reason = 'Take Profit'
                # Profit is strictly Risk * R:R Ratio, minus fees
                gross_profit = (CAPITAL_INR * RISK_PER_TRADE_PCT) * RR_RATIO
                net_pnl_inr = gross_profit - (pos_size_usd * FEE_PCT * 2 * INR_PER_USD)

            else:
                continue # Still in trade

            trades.append({
                'symbol': symbol,
                'direction': 'LONG' if position == 1 else 'SHORT',
                'entry_time': entry_time,
                'exit_time': df_signals.index[i],
                'entry_price': entry_price,
                'exit_price': exit_price,
                'pnl_inr': net_pnl_inr,
                'reason': exit_reason,
                'result': 'WIN' if net_pnl_inr > 0 else 'LOSS'
            })

            position = 0 # Reset
            continue

        # --- Check for Entries if flat ---
        if position == 0 and row['signal'] != 0:
            position = row['signal']
            entry_price = row['signal_price']
            sl_price = row['sl_price']
            tp_price = row['tp_price']
            entry_time = df_signals.index[i]

            # Risk Management: Sizing based on fixed ATR SL distance
            sl_distance_pct = abs(entry_price - sl_price) / entry_price
            if sl_distance_pct == 0: sl_distance_pct = 0.01

            risk_usd = (CAPITAL_INR * RISK_PER_TRADE_PCT) / INR_PER_USD
            pos_size_usd = risk_usd / sl_distance_pct

            # Max leverage check
            max_pos_usd = (CAPITAL_INR / INR_PER_USD) * LEVERAGE
            pos_size_usd = min(pos_size_usd, max_pos_usd)

    return trades

def generate_report(all_trades):
    if not all_trades:
        print("No trades executed.")
        return None

    df_trades = pd.DataFrame(all_trades)

    total_trades = len(df_trades)
    wins = len(df_trades[df_trades['result'] == 'WIN'])
    losses = total_trades - wins
    win_rate = (wins / total_trades) * 100 if total_trades > 0 else 0

    total_pnl_inr = df_trades['pnl_inr'].sum()

    gross_wins = df_trades[df_trades['pnl_inr'] > 0]['pnl_inr'].sum()
    gross_losses = abs(df_trades[df_trades['pnl_inr'] < 0]['pnl_inr'].sum())
    profit_factor = gross_wins / gross_losses if gross_losses > 0 else 999.9

    # Drawdown
    df_trades['cumulative_pnl'] = df_trades['pnl_inr'].cumsum()
    df_trades['equity'] = CAPITAL_INR + df_trades['cumulative_pnl']
    peak = df_trades['equity'].cummax()
    drawdown = (peak - df_trades['equity']) / peak * 100
    max_dd = drawdown.max()

    print("\n" + "="*60)
    print(" 🚀 MIND POWER VAULTT: HIGH ACCURACY TREND RIDER v2.0")
    print("="*60)
    print(f"Initial Capital   : Rs. {CAPITAL_INR:,.0f} ({LEVERAGE}x Leverage)")
    print(f"Total Trades      : {total_trades}")
    print(f"Win Rate          : {win_rate:.1f}% ({wins}W / {losses}L)")
    print(f"Total PnL (INR)   : Rs. {total_pnl_inr:+,.0f}")
    print(f"Profit Factor     : {profit_factor:.2f}")
    print(f"Fixed R:R Target  : 1 : {RR_RATIO}")
    print(f"Max Drawdown      : {max_dd:.1f}%")
    print("="*60)

    return df_trades

def main():
    print("Initializing Engine V2...")

    # Fetch data (Using 30 days default for testing)
    data = prepare_data(SYMBOLS, limit_ltf=2880)

    if not data:
        print("No data fetched. Check your connection or region.")
        return

    all_trades = []

    print("Processing V2 Strategies...")
    for symbol, dfs in data.items():
        df_15m = calculate_indicators(dfs['15m'], is_htf=False)
        df_1h = calculate_indicators(dfs['1h'], is_htf=True)

        df_aligned = align_htf_to_ltf(df_15m, df_1h)
        df_signals = generate_signals(df_aligned)

        trades = run_backtest(df_signals, symbol)
        all_trades.extend(trades)

    df_results = generate_report(all_trades)

    if df_results is not None:
        df_results.to_csv("trend_rider_results.csv", index=False)
        print("Detailed trade log saved to trend_rider_results.csv")

if __name__ == "__main__":
    main()
