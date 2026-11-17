from setuptools import setup, find_packages

setup(
    name="traceguard",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "rich>=13.0.0",
        "networkx>=3.0",
        "pydantic>=2.0.0",
    ],
    entry_points={
        "console_scripts": [
            "traceguard=traceguard.cli:main",
        ],
    },
)
