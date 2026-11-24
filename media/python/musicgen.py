"""Create a short music cue with Meta's MusicGen small model."""

from argparse import ArgumentParser
from pathlib import Path

MODEL = "facebook/musicgen-small"
REVISION = "4c8334b02c6ec4e8664a91979669a501ec497792"


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--prompt", default="Airy steel mallet game reveal sting, three bright notes, no vocals")
    parser.add_argument("--seconds", type=float, default=2)
    parser.add_argument("--backend", choices=["transformers", "audiocraft"], default="transformers")
    args = parser.parse_args()
    if not 0.2 <= args.seconds <= 10:
        parser.error("--seconds must be between 0.2 and 10")
    args.output.parent.mkdir(parents=True, exist_ok=True)

    if args.backend == "audiocraft":
        from audiocraft.data.audio import audio_write
        from audiocraft.models import MusicGen

        model = MusicGen.get_pretrained(MODEL)
        model.set_generation_params(duration=args.seconds)
        cue = model.generate([args.prompt])[0].cpu()
        if args.output.suffix.lower() != ".wav":
            parser.error("output must end with .wav")
        audio_write(args.output.with_suffix(""), cue, model.sample_rate, strategy="peak")
    else:
        import numpy as np
        import torch
        from scipy.io.wavfile import write
        from transformers import AutoProcessor, MusicgenForConditionalGeneration

        torch.set_num_threads(3)
        processor = AutoProcessor.from_pretrained(MODEL, revision=REVISION)
        model = MusicgenForConditionalGeneration.from_pretrained(
            MODEL, revision=REVISION, use_safetensors=True
        )
        inputs = processor(text=[args.prompt], padding=True, return_tensors="pt")
        with torch.inference_mode():
            audio = model.generate(**inputs, max_new_tokens=round(50 * args.seconds), do_sample=True)[0, 0]
        samples = (audio.cpu().numpy().clip(-1, 1) * 32767).astype(np.int16)
        write(args.output, model.config.audio_encoder.sampling_rate, samples)

    print(args.output)


if __name__ == "__main__":
    main()
