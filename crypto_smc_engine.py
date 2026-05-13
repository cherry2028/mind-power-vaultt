import pandas as pd
import numpy as np

class CryptoSMCEngine:
    """
    Advanced Crypto SMC Strategy Engine for Mind Power Vaultt
    Features:
    - Multi-Timeframe (MTF) Context using HTF trend filters
    - Strict Order Block (OB) and Fair Value Gap (FVG) detection
    - Dynamic Stop Loss (SL) based on structural lows/highs
    - Risk to Reward (RR) Targets (Take Profit)
    - Trailing Stop Loss (Breakeven Logic)
    """

    def __init__(self, data, htf_ema_period=200):
        # data should be lower timeframe (e.g. 15m or 1H)
        self.df = data.copy()
        self.htf_ema_period = htf_ema_period
        
    def add_mtf_bias(self):
        """
        Uses a Higher Timeframe Proxy (like a 200 EMA on LTF) to determine the Institutional Directional Bias.
        Institutions rarely trade against the major trend.
        """
        self.df['HTF_EMA'] = self.df['Close'].rolling(window=self.htf_ema_period).mean()
        self.df['Bias'] = np.where(self.df['Close'] > self.df['HTF_EMA'], 1, -1) # 1 for Bullish, -1 for Bearish

    def find_swing_points(self, window=8):
        """
        Identifies structural Swing Highs and Swing Lows.
        Used for Stop Loss placement and Target Liquidity.
        """
        self.df['Swing_High'] = self.df['High'] == self.df['High'].rolling(window=window*2+1, center=True).max()
        self.df['Swing_Low'] = self.df['Low'] == self.df['Low'].rolling(window=window*2+1, center=True).min()
        
        # Forward fill the last known swing high/low prices for SL calculation
        self.df['Last_Swing_High'] = np.where(self.df['Swing_High'], self.df['High'], np.nan)
        self.df['Last_Swing_Low'] = np.where(self.df['Swing_Low'], self.df['Low'], np.nan)
        self.df['Last_Swing_High'] = self.df['Last_Swing_High'].ffill()
        self.df['Last_Swing_Low'] = self.df['Last_Swing_Low'].ffill()

    def identify_smc_zones(self):
        """
        Detects Order Blocks (OB) and Fair Value Gaps (FVG)
        """
        # --- Fair Value Gaps (Imbalances) ---
        prev_high = self.df['High'].shift(2)
        next_low = self.df['Low']
        prev_low = self.df['Low'].shift(2)
        next_high = self.df['High']
        
        # Bullish FVG: Current Low > High 2 candles ago + Bullish Candle
        self.df['Bullish_FVG'] = (next_low > prev_high) & (self.df['Close'].shift(1) > self.df['Open'].shift(1))
        
        # Bearish FVG: Current High < Low 2 candles ago + Bearish Candle
        self.df['Bearish_FVG'] = (next_high < prev_low) & (self.df['Close'].shift(1) < self.df['Open'].shift(1))

        # --- Order Blocks ---
        # Bullish OB: Last bearish candle before a strong bullish push that breaks highs
        prev_close = self.df['Close'].shift(1)
        prev_open = self.df['Open'].shift(1)
        self.df['Bullish_OB'] = (prev_close < prev_open) & (self.df['Close'] > self.df['Open']) & (self.df['Close'] > self.df['High'].shift(1))
        
        # Bearish OB: Last bullish candle before a strong bearish push that breaks lows
        self.df['Bearish_OB'] = (prev_close > prev_open) & (self.df['Close'] < self.df['Open']) & (self.df['Close'] < self.df['Low'].shift(1))

    def generate_signals(self):
        self.add_mtf_bias()
        self.find_swing_points()
        self.identify_smc_zones()
        
        self.df['Signal'] = 0
        
        # BUY SIGNAL: Bullish Trend + (Bullish FVG or Bullish OB)
        buy_cond = (self.df['Bias'] == 1) & (self.df['Bullish_FVG'] | self.df['Bullish_OB'])
        
        # SELL SIGNAL: Bearish Trend + (Bearish FVG or Bearish OB)
        sell_cond = (self.df['Bias'] == -1) & (self.df['Bearish_FVG'] | self.df['Bearish_OB'])
        
        self.df.loc[buy_cond, 'Signal'] = 1
        self.df.loc[sell_cond, 'Signal'] = -1

    def backtest(self, initial_capital=100000, risk_per_trade=0.02, reward_ratio=3):
        """
        Executes trades with proper SL, TP, and Trailing Stop logic.
        """
        self.generate_signals()
        
        capital = initial_capital
        position = 0  # +1 for Long, -1 for Short
        entry_price = 0
        stop_loss = 0
        take_profit = 0
        position_size = 0
        
        equity_curve = []
        trades = []
        winning_trades, losing_trades = 0, 0
        
        for index, row in self.df.iterrows():
            # Check for active trade exits (Stop Loss, Take Profit, Trailing SL)
            if position == 1: # LONG POSITION
                # Hit Stop Loss
                if row['Low'] <= stop_loss:
                    loss_amount = position_size * (entry_price - stop_loss)
                    capital -= loss_amount
                    trades.append({'Type': 'LONG', 'Result': 'LOSS', 'Entry': entry_price, 'Exit': stop_loss, 'Profit': -loss_amount})
                    losing_trades += 1
                    position = 0
                    
                # Hit Take Profit
                elif row['High'] >= take_profit:
                    profit_amount = position_size * (take_profit - entry_price)
                    capital += profit_amount
                    trades.append({'Type': 'LONG', 'Result': 'WIN', 'Entry': entry_price, 'Exit': take_profit, 'Profit': profit_amount})
                    winning_trades += 1
                    position = 0
                    
                # Trailing SL (If price moves 1:1 risk in our favor, move SL to breakeven)
                elif row['Close'] > entry_price + (entry_price - stop_loss):
                    stop_loss = entry_price # Breakeven
                    
            elif position == -1: # SHORT POSITION
                # Hit Stop Loss
                if row['High'] >= stop_loss:
                    loss_amount = position_size * (stop_loss - entry_price)
                    capital -= loss_amount
                    trades.append({'Type': 'SHORT', 'Result': 'LOSS', 'Entry': entry_price, 'Exit': stop_loss, 'Profit': -loss_amount})
                    losing_trades += 1
                    position = 0
                    
                # Hit Take Profit
                elif row['Low'] <= take_profit:
                    profit_amount = position_size * (entry_price - take_profit)
                    capital += profit_amount
                    trades.append({'Type': 'SHORT', 'Result': 'WIN', 'Entry': entry_price, 'Exit': take_profit, 'Profit': profit_amount})
                    winning_trades += 1
                    position = 0
                    
                # Trailing SL
                elif row['Close'] < entry_price - (stop_loss - entry_price):
                    stop_loss = entry_price # Breakeven

            # Check for new entries if no active position
            if position == 0:
                if row['Signal'] == 1:
                    # Execute LONG
                    position = 1
                    entry_price = row['Close']
                    # SL placed slightly below the last swing low
                    stop_loss = row['Last_Swing_Low'] * 0.999 
                    
                    # Prevent zero or inverted SL risk
                    if stop_loss >= entry_price or pd.isna(stop_loss):
                        stop_loss = entry_price * 0.98 # Default 2% SL if structure fails
                        
                    risk_amount = capital * risk_per_trade
                    price_risk = entry_price - stop_loss
                    position_size = risk_amount / price_risk
                    
                    take_profit = entry_price + (price_risk * reward_ratio)
                    
                elif row['Signal'] == -1:
                    # Execute SHORT
                    position = -1
                    entry_price = row['Close']
                    # SL placed slightly above the last swing high
                    stop_loss = row['Last_Swing_High'] * 1.001 
                    
                    if stop_loss <= entry_price or pd.isna(stop_loss):
                        stop_loss = entry_price * 1.02 # Default 2% SL
                        
                    risk_amount = capital * risk_per_trade
                    price_risk = stop_loss - entry_price
                    position_size = risk_amount / price_risk
                    
                    take_profit = entry_price - (price_risk * reward_ratio)

            # Daily equity tracking
            # Calculate floating PnL
            floating_pnl = 0
            if position == 1:
                floating_pnl = position_size * (row['Close'] - entry_price)
            elif position == -1:
                floating_pnl = position_size * (entry_price - row['Close'])
                
            equity_curve.append(capital + floating_pnl)
            
        self.df['Equity'] = equity_curve
        final_equity = equity_curve[-1]
        
        # Calculate max drawdown
        equity_series = pd.Series(equity_curve)
        rolling_max = equity_series.cummax()
        drawdown = (equity_series - rolling_max) / rolling_max * 100
        max_drawdown = drawdown.min()

        print("\n=== MIND POWER VAULTT CRYPTO SMC ENGINE RESULTS ===")
        print(f"Initial Capital   : Rs. {initial_capital:,.2f}")
        print(f"Final Equity      : Rs. {final_equity:,.2f}")
        print(f"Total Return      : {((final_equity - initial_capital) / initial_capital) * 100:.2f}%")
        print(f"Max Drawdown      : {max_drawdown:.2f}%")
        print("---------------------------------------------------")
        total_trades = winning_trades + losing_trades
        print(f"Total Trades      : {total_trades}")
        print(f"Winning Trades    : {winning_trades}")
        print(f"Losing Trades     : {losing_trades}")
        print(f"Accuracy (Win %)  : {(winning_trades/total_trades*100) if total_trades > 0 else 0:.2f}%")
        print(f"Risk:Reward Ratio : 1 : {reward_ratio}")
        print("===================================================\n")
        
        return self.df, trades

if __name__ == "__main__":
    print("Initializing Crypto SMC Engine for 15M Timeframe...")
    
    # Generate Highly Volatile Crypto Dummy Data (Bitcoin style)
    np.random.seed(101)
    # Simulate 1 year of 15-minute candles (approx 35000 candles)
    dates = pd.date_range(start='2023-01-01', periods=35000, freq='15min')
    
    # Random walk with high volatility
    returns = np.random.normal(0, 0.002, 35000)
    close_prices = 60000 * np.exp(np.cumsum(returns))
    
    data = pd.DataFrame({
        'Open': close_prices * (1 + np.random.normal(0, 0.001, 35000)),
        'High': close_prices * (1 + abs(np.random.normal(0, 0.002, 35000))),
        'Low': close_prices * (1 - abs(np.random.normal(0, 0.002, 35000))),
        'Close': close_prices,
    }, index=dates)
    
    # Fix High/Low anomalies from random gen
    data['High'] = data[['Open', 'Close', 'High']].max(axis=1)
    data['Low'] = data[['Open', 'Close', 'Low']].min(axis=1)
    
    # 1 Lakh Capital -> ~1200 USD equivalent (crypto terms)
    engine = CryptoSMCEngine(data)
    results, trade_log = engine.backtest(initial_capital=100000, risk_per_trade=0.02, reward_ratio=3)
