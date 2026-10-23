.PHONY: dev validate venv

PYTHON ?= python3
VENV := .venv
BIN := $(VENV)/bin

venv:
	$(PYTHON) -m venv $(VENV)
	$(BIN)/pip install -e pipeline

dev:
	cd web && npm run dev

validate: $(BIN)/python
	$(BIN)/python -m golden_hour.validate

$(BIN)/python:
	$(MAKE) venv
