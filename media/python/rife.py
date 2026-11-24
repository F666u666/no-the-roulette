"""Double a clip's frame rate using the ECCV2022-RIFE inference script."""

from argparse import ArgumentParser
from pathlib import Path
import os
import shutil
import subprocess
import sys
from fractions import Fraction
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[2]
UPSTREAM = ROOT / "work/rife-upstream"


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if not args.input.is_file():
        parser.error("input must be a video file")
    if args.output.suffix.lower() != ".mp4":
        parser.error("output must end with .mp4")
    if not (UPSTREAM / "inference_video.py").is_file() or not (UPSTREAM / "train_log/flownet.pkl").is_file():
        parser.error("install the official RIFE checkout and model weights as described in media/README.md")

    rate = Fraction(subprocess.check_output(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
         "stream=avg_frame_rate", "-of", "default=nw=1:nk=1", str(args.input.resolve())],
        text=True,
    ).strip())
    if rate.denominator != 1 or rate <= 0:
        parser.error("use a constant integer frame rate such as 24, 30 or 60")

    with TemporaryDirectory(prefix="roulette-rife-", dir=ROOT / "work") as work:
        directory = Path(work)
        # RIFE shells out when transferring audio. Pass fixed filenames in a private working folder.
        shutil.copyfile(args.input, directory / "input.mp4")
        (directory / "train_log").symlink_to(UPSTREAM / "train_log", target_is_directory=True)
        env = {**os.environ, "PYTHONPATH": str(UPSTREAM), "OMP_NUM_THREADS": "3"}
        # scikit-video still refers to aliases removed in recent NumPy.
        bootstrap = (
            "import numpy, runpy, sys; numpy.float = float; numpy.int = int; "
            "sys.argv = sys.argv[1:]; runpy.run_path(sys.argv[0], run_name='__main__')"
        )
        subprocess.run(
            [sys.executable, "-c", bootstrap, str(UPSTREAM / "inference_video.py"),
             "--exp=1", "--video=input.mp4", "--output=output.mp4", f"--fps={int(2 * rate)}"],
            cwd=directory, env=env, check=True,
        )
        result = directory / "output.mp4"
        if not result.is_file() or result.stat().st_size == 0:
            raise RuntimeError("RIFE did not produce an output video")
        args.output.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(result), "-i", str(args.input),
             "-map", "0:v:0", "-map", "1:a?", "-c:v", "copy", "-c:a", "aac", str(args.output)],
            check=True,
        )
    print(args.output)


if __name__ == "__main__":
    main()
