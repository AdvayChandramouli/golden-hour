"""Pydantic v2 models mirroring data/spots.schema.json."""

from __future__ import annotations

from datetime import date
from enum import Enum
from typing import Literal

from pydantic import AnyUrl, BaseModel, ConfigDict, Field


class BestFor(str, Enum):
    sunrise = "sunrise"
    sunset = "sunset"
    both = "both"


class Access(str, Enum):
    public_free = "public_free"
    public_paid = "public_paid"
    restricted = "restricted"
    unknown = "unknown"


class Tag(str, Enum):
    rooftop = "rooftop"
    park = "park"
    lake = "lake"
    bridge = "bridge"
    garage = "garage"
    overlook = "overlook"
    trail = "trail"
    pier = "pier"
    plaza = "plaza"


class ViewQuality(str, Enum):
    open = "open"
    partial = "partial"
    blocked = "blocked"
    unknown = "unknown"


class SourceKind(str, Enum):
    osm = "osm"
    web = "web"
    reddit = "reddit"
    manual = "manual"


class Facing(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sunrise_view: ViewQuality
    sunset_view: ViewQuality


class HorizonScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sunrise: float = Field(ge=0, le=1)
    sunset: float = Field(ge=0, le=1)


class Source(BaseModel):
    model_config = ConfigDict(extra="forbid")

    url: AnyUrl
    kind: SourceKind
    retrieved_at: date


class Spot(BaseModel):
    """Feature properties for a viewing spot."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    name: str = Field(min_length=1)
    best_for: BestFor
    tags: list[Tag] = Field(min_length=1)
    description: str = Field(min_length=1)
    access: Access
    hours_note: str | None
    parking_note: str | None
    facing: Facing
    horizon_score: HorizonScore | None
    sources: list[Source] = Field(min_length=1)
    mention_count: int = Field(ge=1)
    verified: bool
    last_updated: date


class PointGeometry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Point"]
    coordinates: tuple[float, float]


class SpotFeature(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Feature"]
    geometry: PointGeometry
    properties: Spot


class SpotCollection(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["FeatureCollection"]
    features: list[SpotFeature] = Field(min_length=1)
    note: str | None = Field(default=None, alias="_note")
