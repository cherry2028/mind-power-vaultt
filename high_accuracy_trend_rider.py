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

# Coin Universe - 25 High Performing Coins
SYMBOLS = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT',
    'ADA/USDT', 'DOGE/USDT', 'AVAX/USDT', 'LINK/USDT', 'DOT/USDT',
    'MATIC/USDT', 'LTC/USDT', 'BCH/USDT', 'UNI/USDT', 'ATOM/USDT',
    'ETC/USDT', 'FIL/USDT', 'NEAR/USDT', 'APT/USDT', 'OP/USDT',
    'ARB/USDT', 'INJ/USDT', 'RNDR/USDT', 'ZEC/USDT', 'PAXG/USDT'
]

print("Mind Power Vaultt: High Accuracy Strategy Constants Initialized.")

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

# ---- 3. Multi-Timeframe Strategy Logic ----
def calculate_indicators(df, is_htf=False):
    df = df.copy()
    if is_htf:
        df['ema_50'] = ta.ema(df['close'], length=50)
        df['ema_200'] = ta.ema(df['close'], length=200)
        st_htf = ta.supertrend(df['high'], df['low'], df['close'], length=10, multiplier=3.0)
        df['st_dir_htf'] = st_htf['SUPERTd_10_3.0'] if st_htf is not None else np.nan
    else:
        st_ltf = ta.supertrend(df['high'], df['low'], df['close'], length=10, multiplier=2.5)
        df['st_dir_ltf'] = st_ltf['SUPERTd_10_2.5'] if st_ltf is not None else np.nan
        df['st_val_ltf'] = st_ltf['SUPERT_10_2.5'] if st_ltf is not None else np.nan
        adx = ta.adx(df['high'], df['low'], df['close'], length=14)
        df['adx'] = adx['ADX_14'] if adx is not None else np.nan
        df['ema_10'] = ta.ema(df['close'], length=10) # Faster EMA for responsive entries
        df['ema_30'] = ta.ema(df['close'], length=30)
    return df

def align_htf_to_ltf(df_ltf, df_htf):
    df_ltf = df_ltf.copy()
    df_htf = df_htf[['ema_50', 'ema_200', 'st_dir_htf']].add_suffix('_1h')
    merged = df_ltf.join(df_htf, how='left')
    merged.ffill(inplace=True)
    return merged

def generate_signals(df):
    df['signal'], df['signal_price'], df['sl_price'] = 0, np.nan, np.nan
    df['prev_st_dir_ltf'] = df['st_dir_ltf'].shift(1)

    for i in range(1, len(df)):
        if pd.isna(df['adx'].iloc[i]) or pd.isna(df['st_dir_htf_1h'].iloc[i]): continue

        # Tuned to ADX > 20 for more entries while avoiding complete chop
        adx_filter = df['adx'].iloc[i] > 20

        # Trend filters
        htf_bullish = df['st_dir_htf_1h'].iloc[i] == 1
        htf_bearish = df['st_dir_htf_1h'].iloc[i] == -1

        ltf_bullish = df['ema_10'].iloc[i] > df['ema_30'].iloc[i]
        ltf_bearish = df['ema_10'].iloc[i] < df['ema_30'].iloc[i]

        # Trigger
        flip_long = (df['st_dir_ltf'].iloc[i] == 1) and (df['prev_st_dir_ltf'].iloc[i] == -1)
        flip_short = (df['st_dir_ltf'].iloc[i] == -1) and (df['prev_st_dir_ltf'].iloc[i] == 1)

        if flip_long and adx_filter and htf_bullish and ltf_bullish:
            df.iat[i, df.columns.get_loc('signal')] = 1
            df.iat[i, df.columns.get_loc('signal_price')] = df['close'].iloc[i]
            df.iat[i, df.columns.get_loc('sl_price')] = df['st_val_ltf'].iloc[i]

        elif flip_short and adx_filter and htf_bearish and ltf_bearish:
            df.iat[i, df.columns.get_loc('signal')] = -1
            df.iat[i, df.columns.get_loc('signal_price')] = df['close'].iloc[i]
            df.iat[i, df.columns.get_loc('sl_price')] = df['st_val_ltf'].iloc[i]

    return df

# ---- 4. Backtester Engine ----
def run_backtest(df_signals, symbol):
    trades = []
    position, entry_price, sl_price, pos_size_usd, entry_time = 0, 0, 0, 0, None

    for i in range(1, len(df_signals)):
        row = df_signals.iloc[i]

        if position != 0:
            if position == 1 and row['st_dir_ltf'] == 1:
                sl_price = max(sl_price, row['st_val_ltf'])
            elif position == -1 and row['st_dir_ltf'] == -1:
                sl_price = min(sl_price, row['st_val_ltf'])

            hit_sl_long = position == 1 and row['low'] <= sl_price
            hit_sl_short = position == -1 and row['high'] >= sl_price
            st_flip_against = (position == 1 and row['st_dir_ltf'] == -1) or (position == -1 and row['st_dir_ltf'] == 1)

            if hit_sl_long or hit_sl_short or st_flip_against:
                exit_price = sl_price if (hit_sl_long or hit_sl_short) else row['close']

                if position == 1:
                    gross_pnl_usd = (exit_price - entry_price) / entry_price * pos_size_usd
                else:
                    gross_pnl_usd = (entry_price - exit_price) / entry_price * pos_size_usd

                net_pnl_inr = (gross_pnl_usd - (pos_size_usd * FEE_PCT * 2)) * INR_PER_USD

                trades.append({
                    'symbol': symbol, 'direction': 'LONG' if position == 1 else 'SHORT',
                    'entry_time': entry_time, 'exit_time': df_signals.index[i],
                    'pnl_inr': net_pnl_inr, 'result': 'WIN' if net_pnl_inr > 0 else 'LOSS'
                })
                position = 0

        if position == 0 and row['signal'] != 0:
            position = row['signal']
            entry_price, sl_price, entry_time = row['signal_price'], row['sl_price'], df_signals.index[i]

            sl_distance_pct = max(abs(entry_price - sl_price) / entry_price, 0.005) # Min 0.5% distance
            risk_usd = (CAPITAL_INR * RISK_PER_TRADE_PCT) / INR_PER_USD

            # Position sizing ensuring we don't exceed max leverage
            pos_size_usd = risk_usd / sl_distance_pct
            max_pos_usd = (CAPITAL_INR / INR_PER_USD) * LEVERAGE
            pos_size_usd = min(pos_size_usd, max_pos_usd)

    return trades

def generate_report(all_trades):
    if not all_trades: return
    df_trades = pd.DataFrame(all_trades)
    wins = len(df_trades[df_trades['result'] == 'WIN'])
    total = len(df_trades)

    # Simple summary for the script
    print("\n" + "="*60)
    print(" 🚀 MIND POWER VAULTT: HIGH ACCURACY TREND RIDER v1.0")
    print("="*60)
    print(f"Total Trades      : {total}")
    print(f"Win Rate          : {(wins/total)*100:.1f}%")
    print(f"Total PnL (INR)   : Rs. {df_trades['pnl_inr'].sum():+,.0f}")
    print("="*60)
    return df_trades

def main():
    print("Initializing Engine...")

    # 1. Fetch live historical data from Binance
    # Note: If you encounter API blocks due to region, you will need a VPN
    data = prepare_data(SYMBOLS, limit_ltf=2880) # ~30 days of 15m data

    if not data:
        print("No data fetched. Exiting.")
        return

    all_trades = []

    print("Processing Strategies...")
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
