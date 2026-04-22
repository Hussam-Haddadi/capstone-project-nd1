# model_defenseV2

نسخة تدريب/تقييم للديفينس باستخدام الداتا:

- `data/processed/final_dataset_v2.csv`

## Run order

من داخل `model_defenseV2/notebooks/` شغّل بالنظام:

1) `01_data_exploration.ipynb`  
2) `02_feature_engineering.ipynb`  
3) `03_model_training.ipynb`  → يحفظ `model_defenseV2/models/defence_model_v2.pkl`  
4) `04_evaluation.ipynb`  
5) `05_test_model.ipynb`  

## Usage

```python
from model_defenseV2.src.detector import PhishingDetector

detector = PhishingDetector("model_defenseV2/models/defence_model_v2.pkl")
result = detector.predict("نص الرسالة")
```

