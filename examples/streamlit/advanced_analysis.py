import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
from datetime import datetime, timedelta
from scipy import stats
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import DBSCAN
import seaborn as sns
import matplotlib.pyplot as plt

# Advanced analysis functions
class StreamAnalyzer:
    """Advanced analysis for JSON streams"""
    
    def __init__(self):
        self.scaler = StandardScaler()
        
    def detect_anomalies_zscore(self, df, column='value', threshold=3):
        """Detect anomalies using Z-score method"""
        if column not in df.columns:
            return df
        
        z_scores = np.abs(stats.zscore(df[column]))
        df['anomaly_zscore'] = z_scores > threshold
        df['z_score'] = z_scores
        return df
    
    def detect_anomalies_iqr(self, df, column='value'):
        """Detect anomalies using Interquartile Range method"""
        if column not in df.columns:
            return df
        
        Q1 = df[column].quantile(0.25)
        Q3 = df[column].quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        
        df['anomaly_iqr'] = (df[column] < lower_bound) | (df[column] > upper_bound)
        return df
    
    def detect_anomalies_isolation_forest(self, df, columns=['value']):
        """Detect anomalies using Isolation Forest"""
        from sklearn.ensemble import IsolationForest
        
        valid_columns = [col for col in columns if col in df.columns]
        if not valid_columns:
            return df
        
        X = df[valid_columns].values
        iso_forest = IsolationForest(contamination=0.1, random_state=42)
        df['anomaly_isolation'] = iso_forest.fit_predict(X) == -1
        return df
    
    def perform_clustering(self, df, columns=['value'], n_clusters='auto'):
        """Perform DBSCAN clustering on the data"""
        valid_columns = [col for col in columns if col in df.columns]
        if not valid_columns:
            return df
        
        X = df[valid_columns].values
        X_scaled = self.scaler.fit_transform(X)
        
        if n_clusters == 'auto':
            dbscan = DBSCAN(eps=0.3, min_samples=5)
        else:
            dbscan = DBSCAN(eps=0.3, min_samples=n_clusters)
        
        df['cluster'] = dbscan.fit_predict(X_scaled)
        return df
    
    def calculate_rolling_statistics(self, df, column='value', windows=[5, 10, 20]):
        """Calculate various rolling statistics"""
        if column not in df.columns:
            return df
        
        for window in windows:
            if len(df) >= window:
                df[f'rolling_mean_{window}'] = df[column].rolling(window=window).mean()
                df[f'rolling_std_{window}'] = df[column].rolling(window=window).std()
                df[f'rolling_min_{window}'] = df[column].rolling(window=window).min()
                df[f'rolling_max_{window}'] = df[column].rolling(window=window).max()
        
        return df
    
    def detect_trends(self, df, column='value'):
        """Detect trends in the data"""
        if column not in df.columns or len(df) < 10:
            return df
        
        # Linear regression for trend
        X = np.arange(len(df)).reshape(-1, 1)
        y = df[column].values
        
        from sklearn.linear_model import LinearRegression
        model = LinearRegression()
        model.fit(X, y)
        
        df['trend_line'] = model.predict(X)
        df['trend_slope'] = model.coef_[0]
        df['detrended'] = y - df['trend_line']
        
        return df
    
    def calculate_seasonality(self, df, column='value', period=24):
        """Detect seasonality in the data"""
        if column not in df.columns or len(df) < period * 2:
            return df
        
        # Simple seasonality detection using FFT
        from scipy.fft import fft, fftfreq
        
        y = df[column].values
        N = len(y)
        
        yf = fft(y)
        xf = fftfreq(N, 1)[:N//2]
        
        # Find dominant frequencies
        power = 2.0/N * np.abs(yf[0:N//2])
        dominant_freq_idx = np.argmax(power[1:]) + 1
        dominant_period = 1 / xf[dominant_freq_idx] if xf[dominant_freq_idx] != 0 else period
        
        df['seasonality_period'] = dominant_period
        
        return df

# Streamlit app
def main():
    st.set_page_config(
        page_title="Advanced JSON Stream Analysis",
        page_icon="🔬",
        layout="wide"
    )
    
    st.title("🔬 Advanced JSON Stream Analysis")
    st.markdown("---")
    
    # File upload
    uploaded_file = st.file_uploader(
        "Upload JSON Lines file",
        type=['jsonl', 'json'],
        help="Upload a file containing JSON objects, one per line"
    )
    
    if uploaded_file is not None:
        # Load data
        data = []
        for line in uploaded_file:
            try:
                data.append(json.loads(line))
            except:
                continue
        
        if data:
            df = pd.DataFrame(data)
            
            # Convert timestamp if exists
            if 'timestamp' in df.columns:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df = df.sort_values('timestamp')
            
            # Initialize analyzer
            analyzer = StreamAnalyzer()
            
            # Sidebar for analysis options
            st.sidebar.title("🎛️ Analysis Options")
            
            # Select numeric columns
            numeric_columns = df.select_dtypes(include=[np.number]).columns.tolist()
            if numeric_columns:
                primary_column = st.sidebar.selectbox(
                    "Primary Analysis Column",
                    numeric_columns,
                    index=0 if 'value' not in numeric_columns else numeric_columns.index('value')
                )
            else:
                st.error("No numeric columns found in the data!")
                return
            
            # Analysis options
            st.sidebar.subheader("Anomaly Detection")
            use_zscore = st.sidebar.checkbox("Z-Score Method", True)
            zscore_threshold = st.sidebar.slider("Z-Score Threshold", 2.0, 4.0, 3.0, 0.5)
            use_iqr = st.sidebar.checkbox("IQR Method", True)
            use_isolation = st.sidebar.checkbox("Isolation Forest", False)
            
            st.sidebar.subheader("Statistical Analysis")
            use_rolling = st.sidebar.checkbox("Rolling Statistics", True)
            use_trends = st.sidebar.checkbox("Trend Detection", True)
            use_clustering = st.sidebar.checkbox("Clustering", False)
            use_seasonality = st.sidebar.checkbox("Seasonality Analysis", False)
            
            # Perform analysis
            with st.spinner("Analyzing data..."):
                # Anomaly detection
                if use_zscore:
                    df = analyzer.detect_anomalies_zscore(df, primary_column, zscore_threshold)
                if use_iqr:
                    df = analyzer.detect_anomalies_iqr(df, primary_column)
                if use_isolation:
                    df = analyzer.detect_anomalies_isolation_forest(df, [primary_column])
                
                # Statistical analysis
                if use_rolling:
                    df = analyzer.calculate_rolling_statistics(df, primary_column)
                if use_trends:
                    df = analyzer.detect_trends(df, primary_column)
                if use_clustering and len(numeric_columns) > 0:
                    df = analyzer.perform_clustering(df, numeric_columns[:3])
                if use_seasonality:
                    df = analyzer.calculate_seasonality(df, primary_column)
            
            # Display results
            tab1, tab2, tab3, tab4, tab5 = st.tabs([
                "📊 Overview", "🚨 Anomalies", "📈 Trends", "🎯 Clustering", "📋 Raw Data"
            ])
            
            with tab1:
                # Summary statistics
                col1, col2, col3, col4 = st.columns(4)
                
                with col1:
                    st.metric("Total Records", len(df))
                with col2:
                    st.metric("Mean Value", f"{df[primary_column].mean():.2f}")
                with col3:
                    st.metric("Std Dev", f"{df[primary_column].std():.2f}")
                with col4:
                    anomaly_count = 0
                    if 'anomaly_zscore' in df.columns:
                        anomaly_count = df['anomaly_zscore'].sum()
                    st.metric("Anomalies", anomaly_count)
                
                # Time series plot
                if 'timestamp' in df.columns:
                    fig = make_subplots(
                        rows=2, cols=1,
                        shared_xaxes=True,
                        vertical_spacing=0.05,
                        row_heights=[0.7, 0.3]
                    )
                    
                    # Main plot
                    fig.add_trace(
                        go.Scatter(
                            x=df['timestamp'],
                            y=df[primary_column],
                            mode='lines',
                            name='Value',
                            line=dict(color='blue', width=1)
                        ),
                        row=1, col=1
                    )
                    
                    # Add rolling averages
                    if use_rolling:
                        for window in [5, 10, 20]:
                            col_name = f'rolling_mean_{window}'
                            if col_name in df.columns:
                                fig.add_trace(
                                    go.Scatter(
                                        x=df['timestamp'],
                                        y=df[col_name],
                                        mode='lines',
                                        name=f'{window}-MA',
                                        line=dict(width=2)
                                    ),
                                    row=1, col=1
                                )
                    
                    # Add trend line
                    if 'trend_line' in df.columns:
                        fig.add_trace(
                            go.Scatter(
                                x=df['timestamp'],
                                y=df['trend_line'],
                                mode='lines',
                                name='Trend',
                                line=dict(color='red', width=2, dash='dash')
                            ),
                            row=1, col=1
                        )
                    
                    # Volume plot
                    if 'category' in df.columns:
                        category_counts = df.groupby([pd.Grouper(key='timestamp', freq='1min'), 'category']).size().unstack(fill_value=0)
                        for cat in category_counts.columns:
                            fig.add_trace(
                                go.Bar(
                                    x=category_counts.index,
                                    y=category_counts[cat],
                                    name=f'Category {cat}'
                                ),
                                row=2, col=1
                            )
                    
                    fig.update_layout(
                        height=600,
                        showlegend=True,
                        hovermode='x unified'
                    )
                    fig.update_xaxes(title_text="Time", row=2, col=1)
                    fig.update_yaxes(title_text="Value", row=1, col=1)
                    fig.update_yaxes(title_text="Count", row=2, col=1)
                    
                    st.plotly_chart(fig, use_container_width=True)
                
                # Distribution plot
                col1, col2 = st.columns(2)
                
                with col1:
                    fig_hist = px.histogram(
                        df, x=primary_column, nbins=50,
                        title="Value Distribution"
                    )
                    st.plotly_chart(fig_hist, use_container_width=True)
                
                with col2:
                    fig_box = px.box(
                        df, y=primary_column,
                        title="Value Box Plot"
                    )
                    st.plotly_chart(fig_box, use_container_width=True)
            
            with tab2:
                st.subheader("🚨 Anomaly Detection Results")
                
                # Combine anomaly results
                anomaly_columns = [col for col in df.columns if col.startswith('anomaly_')]
                if anomaly_columns:
                    df['any_anomaly'] = df[anomaly_columns].any(axis=1)
                    anomaly_df = df[df['any_anomaly']]
                    
                    st.write(f"Found {len(anomaly_df)} anomalous records out of {len(df)} total records")
                    
                    # Anomaly visualization
                    if 'timestamp' in df.columns:
                        fig = go.Figure()
                        
                        # Normal points
                        normal_df = df[~df['any_anomaly']]
                        fig.add_trace(go.Scatter(
                            x=normal_df['timestamp'],
                            y=normal_df[primary_column],
                            mode='markers',
                            name='Normal',
                            marker=dict(color='blue', size=4)
                        ))
                        
                        # Anomaly points
                        fig.add_trace(go.Scatter(
                            x=anomaly_df['timestamp'],
                            y=anomaly_df[primary_column],
                            mode='markers',
                            name='Anomaly',
                            marker=dict(color='red', size=10, symbol='x')
                        ))
                        
                        fig.update_layout(
                            title="Anomaly Detection Results",
                            height=400
                        )
                        st.plotly_chart(fig, use_container_width=True)
                    
                    # Anomaly details
                    st.subheader("Anomaly Details")
                    display_cols = ['timestamp', primary_column] + anomaly_columns
                    display_cols = [col for col in display_cols if col in anomaly_df.columns]
                    st.dataframe(anomaly_df[display_cols], use_container_width=True)
                else:
                    st.info("No anomaly detection methods were selected.")
            
            with tab3:
                st.subheader("📈 Trend Analysis")
                
                if 'trend_line' in df.columns:
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        # Trend metrics
                        slope = df['trend_slope'].iloc[0] if 'trend_slope' in df.columns else 0
                        direction = "📈 Increasing" if slope > 0 else "📉 Decreasing"
                        st.metric("Trend Direction", direction)
                        st.metric("Trend Slope", f"{slope:.4f}")
                    
                    with col2:
                        # Detrended data
                        if 'detrended' in df.columns:
                            fig = px.line(
                                df, y='detrended',
                                title="Detrended Data"
                            )
                            st.plotly_chart(fig, use_container_width=True)
                
                # Seasonality
                if 'seasonality_period' in df.columns:
                    st.subheader("🔄 Seasonality Analysis")
                    period = df['seasonality_period'].iloc[0]
                    st.metric("Dominant Period", f"{period:.1f} observations")
                else:
                    st.info("Enable seasonality analysis to see periodic patterns.")
            
            with tab4:
                st.subheader("🎯 Clustering Results")
                
                if 'cluster' in df.columns:
                    # Cluster summary
                    cluster_counts = df['cluster'].value_counts().sort_index()
                    
                    col1, col2 = st.columns([1, 2])
                    
                    with col1:
                        st.write("Cluster Distribution:")
                        for cluster, count in cluster_counts.items():
                            if cluster == -1:
                                st.write(f"Noise: {count} points")
                            else:
                                st.write(f"Cluster {cluster}: {count} points")
                    
                    with col2:
                        # Cluster visualization
                        if len(numeric_columns) >= 2:
                            fig = px.scatter(
                                df, x=numeric_columns[0], y=numeric_columns[1],
                                color='cluster',
                                title="Cluster Visualization"
                            )
                            st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("Enable clustering to group similar data points.")
            
            with tab5:
                st.subheader("📋 Raw Data")
                
                # Data filters
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    show_anomalies_only = st.checkbox("Show Anomalies Only")
                
                with col2:
                    n_rows = st.number_input(
                        "Number of rows to display",
                        min_value=10,
                        max_value=len(df),
                        value=min(100, len(df))
                    )
                
                with col3:
                    sort_column = st.selectbox(
                        "Sort by",
                        df.columns.tolist(),
                        index=0 if 'timestamp' not in df.columns else df.columns.tolist().index('timestamp')
                    )
                
                # Apply filters
                display_df = df.copy()
                if show_anomalies_only and 'any_anomaly' in display_df.columns:
                    display_df = display_df[display_df['any_anomaly']]
                
                display_df = display_df.sort_values(sort_column, ascending=False).head(n_rows)
                
                # Display
                st.dataframe(display_df, use_container_width=True)
                
                # Export options
                st.subheader("💾 Export Results")
                
                col1, col2 = st.columns(2)
                
                with col1:
                    csv = df.to_csv(index=False)
                    st.download_button(
                        "Download Full Analysis (CSV)",
                        csv,
                        f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                        "text/csv"
                    )
                
                with col2:
                    # Summary report
                    report = f"""# JSON Stream Analysis Report
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Summary
- Total Records: {len(df)}
- Time Range: {df['timestamp'].min() if 'timestamp' in df.columns else 'N/A'} to {df['timestamp'].max() if 'timestamp' in df.columns else 'N/A'}
- Primary Column: {primary_column}
- Mean: {df[primary_column].mean():.2f}
- Std Dev: {df[primary_column].std():.2f}
- Min: {df[primary_column].min():.2f}
- Max: {df[primary_column].max():.2f}

## Anomalies
- Total Anomalies: {df['any_anomaly'].sum() if 'any_anomaly' in df.columns else 0}
- Percentage: {(df['any_anomaly'].sum() / len(df) * 100):.1f}% if 'any_anomaly' in df.columns else 0}%

## Trend
- Direction: {'Increasing' if 'trend_slope' in df.columns and df['trend_slope'].iloc[0] > 0 else 'Decreasing'}
- Slope: {df['trend_slope'].iloc[0] if 'trend_slope' in df.columns else 'N/A'}
"""
                    st.download_button(
                        "Download Report (TXT)",
                        report,
                        f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
                        "text/plain"
                    )

if __name__ == "__main__":
    main()