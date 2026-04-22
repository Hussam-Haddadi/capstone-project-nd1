# Attach Model

## What is the problem
In order to build a better defence model to detect all the phishing messages, we needed a **big** dataset; however, becuase we could not fine any resource we made our own by collecting 1700 and after cleaning we got only 1100. This prefent us from making a model that not only unable to detect simple phishing patterns but also made things hard to upgrade.

## The solution
We said that a better approach is to build synthitic datasets based on the original datasest, which contains enough patterns to enable us to copy.
So, our solution was to fine-tune a LLM to generate similar messages that has similar features with small randomness.

## Archetict
- We separate our original dataset to two parts:
    - One for the phishing messages
    - And one for the save messages
    - This is done because we wantted best results from the LLM model that we will use.
        - **Side NOTE:**
            - If we fine-tuned one model on both phishing and safe, the model won't generate the bests results because the prompting will be hard to consturct and the model has to do some thinking, which increase the time require to generate a new dataset.
    - Then we have separated each type into 90-10% train-valid
    - And for testing we use any othentic message we have
- For fine-tunning we used the gemma4-26B-A4B-it
    - The reason behind this is that this model gives best performence againest computational power, which reduced the cost significantlly.
- I used Runpod.io to rent a GPU which we used RTX A6000 (best performence againest price)

## Preparation and Traning

### (Optional) virtual environment 
- `python3 -m venv name-of-venv`
- `source name-of-venv/bin/activate`

- `pip install torch==2.8.0 torchvision==0.23.0 torchaudio==2.8.0 --index-url https://download.pytorch.org/whl/cu128`
    - To check the torch:
    - `
        python - <<'PY'
        import torch
        print("torch:", torch.__version__)
        print("cuda runtime:", torch.version.cuda)
        print("cuda available:", torch.cuda.is_available())
        if torch.cuda.is_available():
            print("gpu:", torch.cuda.get_device_name(0))
            print("bf16 supported:", torch.cuda.is_bf16_supported())
        PY
    `
### Install the packages
- `pip install --upgrade pip setuptools wheel`
- `pip install \
  transformers \
  datasets \
  accelerate \
  evaluate \
  bitsandbytes \
  trl \
  peft \
  protobuf \
  sentencepiece \
  tensorboard
  `

### Mounting the data direction
- `mkdir -p /workspace/gemma4-arabic/{data,src,outputs,logs}`
- `mkdir -p /workspace/.cache/huggingface/{hub,transformers,datasets}`
- `mkdir -p /workspace/.cache/pip`

### Start traning
- **Important note:**when you prepared the dataset, put the data in the `data` folder, and after cloning or installing the files in the `src` folder.
- `python train_qlora.py`

### To build the dataset using the adapter (the layer that fine-tuned the base model)
- `pip install ipykernel jupyterlab`
- `python -m ipykernel install --user --name name-of-venv --display-name "Python (name-of-venv)"`
- Then run all the cells in the `testing_finetuned.ipynb`
- You will get two new jsonl files in the data folder similar to the `generated_with_links-safe.jsonl` and `generated_with_links.jsonl`. Find it with the scripts files.
- Also, to increase the dataset per type change the `N_datapoints`