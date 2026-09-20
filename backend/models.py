from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

Level = Literal["learning", "solid", "expert"]
Commitment = Literal["hackathon", "side_project", "cofounder"]
Experience = Literal["first_hackathon", "shipped", "founded"]
TeamSize = Literal["2", "3-4", "any"]
Difficulty = Literal["weekend", "month", "startup"]


class Skill(BaseModel):
    name: str
    level: Level = "solid"


class Prompts(BaseModel):
    hackathon_person: str = ""
    toxic_trait: str = ""
    excited_about: str = ""


class Profile(BaseModel):
    id: str
    name: str
    school: str
    avatar: str = "nova"
    skills: List[Skill] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    want_to_build: str = ""
    commitment: Commitment = "side_project"
    experience: Experience = "shipped"
    team_size: TeamSize = "2"
    prompts: Prompts = Field(default_factory=Prompts)
    builder_title: str = ""
    github: Optional[str] = None


class ProfileIn(BaseModel):
    """What onboarding posts. id is always forced to 'me'."""

    name: str
    school: str = ""
    avatar: str = "nova"
    skills: List[Skill] = Field(default_factory=list)
    missing: List[str] = Field(default_factory=list)
    want_to_build: str = ""
    commitment: Commitment = "side_project"
    experience: Experience = "shipped"
    team_size: TeamSize = "2"
    prompts: Prompts = Field(default_factory=Prompts)
    github: Optional[str] = None


class Score(BaseModel):
    overall: int
    skills: int
    passion: int
    style: int
    commitment: int
    experience: int


class StackEntry(BaseModel):
    profile: Profile
    score: Score
    hook: str
    fills: List[str] = Field(default_factory=list)
    you_bring: List[str] = Field(default_factory=list)
    fit_label: str = ""
    reason: str = ""


class Idea(BaseModel):
    name: str
    one_liner: str
    roles: Dict[str, str]
    difficulty: Difficulty
    needs: List[str] = Field(default_factory=list)


class Mission(BaseModel):
    steps: List[str] = Field(default_factory=list)
    done: List[bool] = Field(default_factory=list)


class ChatMessage(BaseModel):
    from_: Literal["me", "them", "system"] = Field(alias="from")
    text: str
    ts: float

    model_config = {"populate_by_name": True}


class Match(BaseModel):
    id: str
    user_id: str = "me"
    other_id: str
    score: Score
    explanation: str = ""
    ideas: List[Idea] = Field(default_factory=list)
    chosen_idea: Optional[int] = None
    mission: Optional[Mission] = None
    chat: List[ChatMessage] = Field(default_factory=list)


class MatchView(Match):
    """A match plus the other person's profile, so the UI needs one call."""

    other: Profile
    fills: List[str] = Field(default_factory=list)
    you_bring: List[str] = Field(default_factory=list)
    skill_bars: List[Dict] = Field(default_factory=list)
    pending_reply: bool = False


class SwipeIn(BaseModel):
    other_id: str
    dir: Literal["left", "right"]


class IdeaIn(BaseModel):
    index: int


class ToggleIn(BaseModel):
    step: int


class ChatIn(BaseModel):
    text: str
