import pandas as pd
import numpy as np
import datetime
# import matplotlib.pyplot as plt # Uncomment for plotting the equity curve

class SMCAlgoBacktester:
    """
    Mind Power Vaultt - SMC (Smart Money Concepts) Algo Engine
    This class identifies core SMC components like FVGs, Order Blocks, and Swing Structures,
    and runs a systematic backtest to generate an equity curve.
    """
    def __init__(self, data):
        """
        data: Expected to be a Pandas DataFrame with columns ['Open', 'High', 'Low', 'Close', 'Volume']
        """
        self.df = data.copy()
        
    def find_swing_structures(self, window=5):
        """
        Identifies Swing Highs and Swing Lows to determine Liquidity Pools.
        """
        self.df['Swing_High'] = self.df['High'] == self.df['High'].rolling(window=window*2+1, center=True).max()
        self.df['Swing_Low'] = self.df['Low'] == self.df['Low'].rolling(window=window*2+1, center=True).min()
        
    def identify_fvg(self):
        """
        Fair Value Gap (FVG) / Imbalance Identification.
        Bullish FVG: 3rd candle low > 1st candle high.
        Bearish FVG: 3rd candle high < 1st candle low.
        """
        # Shift -1 looks forward, Shift 1 looks backward. So for a 3 candle setup (prev, curr, next):
        # We define FVG based on previous (1st) and next (3rd) relative to current (2nd)
        prev_high = self.df['High'].shift(1)
        next_low = self.df['Low'].shift(-1)
        
        prev_low = self.df['Low'].shift(1)
        next_high = self.df['High'].shift(-1)
        
        # Bullish FVG
        self.df['Bullish_FVG'] = (next_low > prev_high) & (self.df['Close'] > self.df['Open'])
        
        # Bearish FVG
        self.df['Bearish_FVG'] = (next_high < prev_low) & (self.df['Close'] < self.df['Open'])

    def identify_order_blocks(self):
        """
        Order Block (OB) Identification.
        Bullish OB: The last down candle before a strong impulsive upward move.
        Bearish OB: The last up candle before a strong impulsive downward move.
        """
        prev_close = self.df['Close'].shift(1)
        prev_open = self.df['Open'].shift(1)
        
        # Simple Logic: Current candle is strong bullish, previous was bearish
        self.df['Bullish_OB'] = (prev_close < prev_open) & (self.df['Close'] > self.df['Open']) & (self.df['Close'] > self.df['High'].shift(1))
        
        # Current candle is strong bearish, previous was bullish
        self.df['Bearish_OB'] = (prev_close > prev_open) & (self.df['Close'] < self.df['Open']) & (self.df['Close'] < self.df['Low'].shift(1))

    def generate_signals(self):
        """
        Generates trading signals based on SMC concepts combined with trend confirmation.
        """
        self.find_swing_structures()
        self.identify_fvg()
        self.identify_order_blocks()
        
        # 20-period SMA for basic trend filtering (Optional but recommended)
        self.df['Trend_Filter'] = self.df['Close'].rolling(window=20).mean()
        
        self.df['Signal'] = 0
        
        # BUY LOGIC: Price forms a Bullish OB or FVG while above the trend filter
        buy_condition = (self.df['Bullish_FVG'] | self.df['Bullish_OB']) & (self.df['Close'] > self.df['Trend_Filter'])
        
        # SELL LOGIC (for shorting or exiting): Price forms Bearish OB or FVG while below trend
        sell_condition = (self.df['Bearish_FVG'] | self.df['Bearish_OB']) & (self.df['Close'] < self.df['Trend_Filter'])
        
        self.df.loc[buy_condition, 'Signal'] = 1
        self.df.loc[sell_condition, 'Signal'] = -1

    def backtest(self, initial_capital=100000, risk_per_trade=0.02):
        """
        Executes a basic backtest loop over the signals.
        """
        self.generate_signals()
        
        capital = initial_capital
        position = 0
        entry_price = 0
        equity_curve = []
        trades = []
        
        winning_trades = 0
        losing_trades = 0
        
        for index, row in self.df.iterrows():
            if row['Signal'] == 1 and position == 0:
                # Buy Entry
                position = capital / row['Close'] # Full capital allocation for demo
                capital = 0
                entry_price = row['Close']
                
            elif row['Signal'] == -1 and position > 0:
                # Sell / Exit
                capital = position * row['Close']
                exit_price = row['Close']
                
                trade_profit = (exit_price - entry_price) / entry_price * 100 # % profit for this trade
                if trade_profit > 0:
                    winning_trades += 1
                else:
                    losing_trades += 1
                    
                trades.append({'Type': 'TRADE', 'Entry': entry_price, 'Exit': exit_price, 'Profit%': trade_profit})
                position = 0
                entry_price = 0
            
            # Record daily equity
            current_equity = capital + (position * row['Close'] if position > 0 else 0)
            equity_curve.append(current_equity)
            
        self.df['Equity'] = equity_curve
        
        final_equity = equity_curve[-1]
        total_return = ((final_equity - initial_capital) / initial_capital) * 100
        total_trades = winning_trades + losing_trades
        win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
        
        print("\n=== MIND POWER VAULTT SMC BACKTEST RESULTS ===")
        print(f"Initial Capital : Rs. {initial_capital:,.2f}")
        print(f"Final Equity    : Rs. {final_equity:,.2f}")
        print(f"Total Return    : {total_return:.2f}%")
        print(f"Total Trades    : {total_trades}")
        print(f"Winning Trades  : {winning_trades}")
        print(f"Losing Trades   : {losing_trades}")
        print(f"Accuracy (Win %): {win_rate:.2f}%")
        print("==============================================\n")
        
        return self.df, trades

# --- Example Usage Script ---
if __name__ == "__main__":
    print("Mind Power Vaultt - Initializing SMC Algo...")
    
    # 1. Generate Synthetic Nifty/BankNifty Data (Replace with your actual OHLCV data from Yahoo Finance / Broker API)
    np.random.seed(42)
    dates = pd.date_range(start='2023-01-01', periods=1000, freq='D')
    close_prices = 40000 + np.cumsum(np.random.normal(0, 200, 1000)) # Simulated BankNifty
    
    data = pd.DataFrame({
        'Open': close_prices - np.random.normal(0, 50, 1000),
        'High': close_prices + np.random.normal(50, 100, 1000),
        'Low': close_prices - np.random.normal(50, 100, 1000),
        'Close': close_prices,
    }, index=dates)
    
    # 2. Initialize Backtester
    smc_algo = SMCAlgoBacktester(data)
    
    # 3. Run Backtest
    results_df, trade_log = smc_algo.backtest(initial_capital=100000)
    
    # To view the equity curve in a chart (Requires matplotlib: pip install matplotlib)
    '''
    import matplotlib.pyplot as plt
    plt.figure(figsize=(12, 6))
    plt.plot(results_df.index, results_df['Equity'], label='SMC Strategy Equity', color='blue')
    plt.title('Mind Power Vaultt - SMC Algo Performance')
    plt.xlabel('Date')
    plt.ylabel('Account Equity (₹)')
    plt.legend()
    plt.grid(True)
    plt.show()
    '''
