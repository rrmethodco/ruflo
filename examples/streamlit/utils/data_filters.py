"""
Data filtering utilities for JSON stream processing
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional, Callable
from datetime import datetime, timedelta
import re

class DataFilter:
    """Base class for data filters"""
    
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply filter to dataframe"""
        raise NotImplementedError

class TimeRangeFilter(DataFilter):
    """Filter data by time range"""
    
    def __init__(self, start_time: Optional[datetime] = None, 
                 end_time: Optional[datetime] = None,
                 last_n_minutes: Optional[int] = None):
        self.start_time = start_time
        self.end_time = end_time
        self.last_n_minutes = last_n_minutes
    
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        if 'timestamp' not in df.columns:
            return df
        
        df = df.copy()
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        if self.last_n_minutes:
            cutoff_time = datetime.now() - timedelta(minutes=self.last_n_minutes)
            return df[df['timestamp'] >= cutoff_time]
        
        if self.start_time:
            df = df[df['timestamp'] >= self.start_time]
        if self.end_time:
            df = df[df['timestamp'] <= self.end_time]
        
        return df

class ValueRangeFilter(DataFilter):
    """Filter data by value range"""
    
    def __init__(self, column: str, min_value: Optional[float] = None,
                 max_value: Optional[float] = None):
        self.column = column
        self.min_value = min_value
        self.max_value = max_value
    
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        if self.column not in df.columns:
            return df
        
        mask = pd.Series([True] * len(df))
        
        if self.min_value is not None:
            mask &= df[self.column] >= self.min_value
        if self.max_value is not None:
            mask &= df[self.column] <= self.max_value
        
        return df[mask]

class CategoryFilter(DataFilter):
    """Filter data by categories"""
    
    def __init__(self, column: str, categories: List[str], 
                 exclude: bool = False):
        self.column = column
        self.categories = categories
        self.exclude = exclude
    
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        if self.column not in df.columns:
            return df
        
        if self.exclude:
            return df[~df[self.column].isin(self.categories)]
        else:
            return df[df[self.column].isin(self.categories)]

class RegexFilter(DataFilter):
    """Filter data using regex patterns"""
    
    def __init__(self, column: str, pattern: str, flags: int = 0):
        self.column = column
        self.pattern = pattern
        self.flags = flags
        self.regex = re.compile(pattern, flags)
    
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        if self.column not in df.columns:
            return df
        
        mask = df[self.column].astype(str).str.contains(
            self.pattern, regex=True, flags=self.flags, na=False
        )
        return df[mask]

class CustomFilter(DataFilter):
    """Apply custom filter function"""
    
    def __init__(self, filter_func: Callable[[pd.DataFrame], pd.DataFrame]):
        self.filter_func = filter_func
    
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        return self.filter_func(df)

class CompositeFilter(DataFilter):
    """Combine multiple filters"""
    
    def __init__(self, filters: List[DataFilter], operator: str = 'AND'):
        self.filters = filters
        self.operator = operator.upper()
    
    def apply(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self.filters:
            return df
        
        if self.operator == 'AND':
            result = df
            for filter_obj in self.filters:
                result = filter_obj.apply(result)
            return result
        
        elif self.operator == 'OR':
            masks = []
            for filter_obj in self.filters:
                filtered = filter_obj.apply(df)
                mask = df.index.isin(filtered.index)
                masks.append(mask)
            
            combined_mask = masks[0]
            for mask in masks[1:]:
                combined_mask |= mask
            
            return df[combined_mask]
        
        else:
            raise ValueError(f"Unknown operator: {self.operator}")

class DataTransformer:
    """Transform JSON data"""
    
    @staticmethod
    def flatten_json(data: Dict[str, Any], parent_key: str = '', 
                     sep: str = '_') -> Dict[str, Any]:
        """Flatten nested JSON structure"""
        items = []
        for k, v in data.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            if isinstance(v, dict):
                items.extend(
                    DataTransformer.flatten_json(v, new_key, sep=sep).items()
                )
            else:
                items.append((new_key, v))
        return dict(items)
    
    @staticmethod
    def extract_nested_value(data: Dict[str, Any], path: str, 
                           default: Any = None) -> Any:
        """Extract value from nested structure using dot notation"""
        keys = path.split('.')
        value = data
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        
        return value
    
    @staticmethod
    def aggregate_by_time(df: pd.DataFrame, time_column: str = 'timestamp',
                         freq: str = '1min', agg_funcs: Optional[Dict] = None) -> pd.DataFrame:
        """Aggregate data by time intervals"""
        if time_column not in df.columns:
            return df
        
        df = df.copy()
        df[time_column] = pd.to_datetime(df[time_column])
        df.set_index(time_column, inplace=True)
        
        if agg_funcs is None:
            # Default aggregations
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            agg_funcs = {col: ['mean', 'min', 'max', 'count'] for col in numeric_cols}
        
        return df.resample(freq).agg(agg_funcs)

class StreamProcessor:
    """Process streaming JSON data with filters and transformations"""
    
    def __init__(self):
        self.filters: List[DataFilter] = []
        self.transformers: List[Callable] = []
    
    def add_filter(self, filter_obj: DataFilter):
        """Add a filter to the pipeline"""
        self.filters.append(filter_obj)
    
    def add_transformer(self, transformer: Callable):
        """Add a transformer to the pipeline"""
        self.transformers.append(transformer)
    
    def process(self, data: List[Dict[str, Any]]) -> pd.DataFrame:
        """Process data through filters and transformations"""
        # Convert to DataFrame
        df = pd.DataFrame(data)
        
        # Apply filters
        for filter_obj in self.filters:
            df = filter_obj.apply(df)
        
        # Apply transformations
        for transformer in self.transformers:
            df = transformer(df)
        
        return df
    
    def reset(self):
        """Reset all filters and transformers"""
        self.filters.clear()
        self.transformers.clear()

# Utility functions
def create_time_filter(last_n_minutes: int) -> TimeRangeFilter:
    """Create a time filter for last N minutes"""
    return TimeRangeFilter(last_n_minutes=last_n_minutes)

def create_anomaly_filter(df: pd.DataFrame, column: str, 
                         threshold: float = 3.0) -> CustomFilter:
    """Create an anomaly filter based on z-score"""
    mean = df[column].mean()
    std = df[column].std()
    
    def filter_func(data: pd.DataFrame) -> pd.DataFrame:
        z_scores = np.abs((data[column] - mean) / std)
        return data[z_scores > threshold]
    
    return CustomFilter(filter_func)

def create_percentile_filter(df: pd.DataFrame, column: str,
                           lower_percentile: float = 5,
                           upper_percentile: float = 95) -> ValueRangeFilter:
    """Create a filter based on percentiles"""
    lower_bound = df[column].quantile(lower_percentile / 100)
    upper_bound = df[column].quantile(upper_percentile / 100)
    
    return ValueRangeFilter(column, lower_bound, upper_bound)