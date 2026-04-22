



# Working version !!!!!!!


import os
import torch

from datasets import load_dataset
from transformers import (
    AutoModelForImageTextToText,
    AutoProcessor,
    BitsAndBytesConfig,
    Trainer,
    TrainingArguments,
)
from peft import (
    LoraConfig,
    get_peft_model,
)

MODEL_ID = "google/gemma-4-26B-A4B"
PROCESSOR_ID = "google/gemma-4-26B-A4B-it"

# TRAIN_FILE = "/workspace/gemma4-arabic/data/train_smoke_0.jsonl"
# VALID_FILE = "/workspace/gemma4-arabic/data/valid_smoke_0.jsonl"

# After the smoke test works:
TRAIN_FILE = "/workspace/gemma4-arabic/data/augmented_train_1.jsonl"
VALID_FILE = "/workspace/gemma4-arabic/data/augmented_valid_1.jsonl"

OUTPUT_DIR = "/workspace/gemma4-arabic/outputs/gemma4-26b-a4b-qlora-ar-final-v2-safe"

os.environ["HF_HOME"] = "/workspace/.cache/huggingface"
os.environ["HUGGINGFACE_HUB_CACHE"] = "/workspace/.cache/huggingface/hub"
os.environ["TRANSFORMERS_CACHE"] = "/workspace/.cache/huggingface/transformers"
os.environ["HF_DATASETS_CACHE"] = "/workspace/.cache/huggingface/datasets"

if not torch.cuda.is_available():
    raise RuntimeError("CUDA is not available. This script requires a GPU.")

if torch.cuda.is_bf16_supported():
    MODEL_DTYPE = torch.bfloat16
    USE_BF16 = True
    USE_FP16 = False
else:
    MODEL_DTYPE = torch.float16
    USE_BF16 = False
    USE_FP16 = True

print("GPU:", torch.cuda.get_device_name(0))
print("dtype:", MODEL_DTYPE)

dataset = load_dataset(
    "json",
    data_files={
        "train": TRAIN_FILE,
        "validation": VALID_FILE,
    },
)

print(dataset)

processor = AutoProcessor.from_pretrained(PROCESSOR_ID)

if processor.tokenizer.pad_token is None:
    processor.tokenizer.pad_token = processor.tokenizer.eos_token

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=MODEL_DTYPE,
    bnb_4bit_quant_storage=MODEL_DTYPE,
)

model = AutoModelForImageTextToText.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    torch_dtype=MODEL_DTYPE,
    low_cpu_mem_usage=True,
    attn_implementation="eager",
    experts_implementation="eager",
)

if hasattr(model, "set_experts_implementation"):
    model.set_experts_implementation("eager")

model.config.use_cache = False
model.gradient_checkpointing_enable()

if hasattr(model, "enable_input_require_grads"):
    model.enable_input_require_grads()

for param in model.parameters():
    param.requires_grad = False

peft_config = LoraConfig(
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    bias="none",
    target_modules="all-linear",
    task_type="CAUSAL_LM",
)

model = get_peft_model(model, peft_config)

try:
    model.print_trainable_parameters()
except Exception:
    pass

MAX_LENGTH = 384

def normalize_messages(messages):
    normalized = []
    for msg in messages:
        content = msg["content"]
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]
        normalized.append(
            {
                "role": msg["role"],
                "content": content,
            }
        )
    return normalized

def render_chat(example):
    messages = normalize_messages(example["messages"])
    text = processor.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=False,
    )
    return text

def collate_fn(examples):
    texts = [render_chat(ex) for ex in examples]

    batch = processor(
        text=texts,
        padding=True,
        truncation=True,
        max_length=MAX_LENGTH,
        return_tensors="pt",
    )

    if "mm_token_type_ids" not in batch:
        batch["mm_token_type_ids"] = torch.zeros_like(batch["input_ids"])

    labels = batch["input_ids"].clone()

    if "attention_mask" in batch:
        labels[batch["attention_mask"] == 0] = -100

    batch["labels"] = labels
    return batch

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=3, ## This was 1
    per_device_train_batch_size=1,
    per_device_eval_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=5e-5,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    logging_steps=5,
    eval_strategy="steps",
    eval_steps=25,
    save_strategy="steps",
    save_steps=25,
    save_total_limit=2,
    bf16=USE_BF16,
    fp16=USE_FP16,
    gradient_checkpointing=True,
    optim="adamw_torch_fused",
    max_grad_norm=0.3,
    report_to="tensorboard",
    remove_unused_columns=False,
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["validation"],
    data_collator=collate_fn,
)

trainer.train()

trainer.model.save_pretrained(OUTPUT_DIR)
processor.save_pretrained(OUTPUT_DIR)

print(f"Saved adapters and processor to: {OUTPUT_DIR}")

