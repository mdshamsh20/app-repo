#!/usr/bin/env python3
import re
import sys
from pathlib import Path


def update_tag(content: str, image_name: str, image_tag: str) -> str:
    pattern = re.compile(
        rf"(- name: {re.escape(image_name)}\n\s+newTag: )([^\n]+)",
        re.MULTILINE,
    )
    updated, count = pattern.subn(rf"\g<1>{image_tag}", content, count=1)
    if count == 0:
        raise ValueError(f"Image '{image_name}' not found in kustomization file")
    return updated


def main() -> int:
    if len(sys.argv) != 5:
        print(
            "Usage: update_kustomize_images.py <kustomization-path> <registry> <tag> <services>",
            file=sys.stderr,
        )
        return 1

    file_path = Path(sys.argv[1])
    registry = sys.argv[2].rstrip("/")
    tag = sys.argv[3]
    services = [service.strip() for service in sys.argv[4].split(",") if service.strip()]

    content = file_path.read_text()
    for service in services:
        content = update_tag(content, f"{registry}/{service}", tag)

    file_path.write_text(content)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

