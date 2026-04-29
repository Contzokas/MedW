# /// script
# dependencies = [
#   "data-designer",
#   "pydantic",
# ]
# ///
import data_designer.config as dd
from pydantic import BaseModel, Field


class SymptomProfile(BaseModel):
    primary_symptom: str = Field(description="The main symptom the patient is experiencing, specific to the body region")
    additional_symptoms: list[str] = Field(description="2-4 related symptoms that commonly accompany the primary symptom")
    recommended_urgency: str = Field(description="One of: Low, Medium, High, Critical")


class UrgencyAssessment(BaseModel):
    recommended_urgency: str = Field(description="One of: Low, Medium, High, Critical")


class QueryVariations(BaseModel):
    variations: list[str] = Field(description="5-10 distinct ways a layperson might describe these symptoms colloquially in a search bar or to a chatbot")


def load_config_builder() -> dd.DataDesignerConfigBuilder:
    config_builder = dd.DataDesignerConfigBuilder()

    # Patient age: gaussian centered around 42, spread 15
    config_builder.add_column(dd.SamplerColumnConfig(
        name="patient_age",
        sampler_type="gaussian",
        params=dd.GaussianSamplerParams(mean=42, stddev=15),
        convert_to="int",
    ))

    # Patient sex
    config_builder.add_column(dd.SamplerColumnConfig(
        name="patient_sex",
        sampler_type="category",
        params=dd.CategorySamplerParams(values=["Male", "Female"]),
    ))

    # Body region
    config_builder.add_column(dd.SamplerColumnConfig(
        name="body_region",
        sampler_type="category",
        params=dd.CategorySamplerParams(
            values=["Head", "Chest", "Abdomen", "Upper Limbs", "Lower Limbs", "Back", "Skin", "General"],
            weights=[1.2, 1.3, 1.4, 0.8, 1.0, 1.3, 0.7, 1.0],
        ),
    ))

    # Severity level
    config_builder.add_column(dd.SamplerColumnConfig(
        name="severity",
        sampler_type="category",
        params=dd.CategorySamplerParams(
            values=["Mild", "Moderate", "Severe", "Emergency"],
            weights=[2.5, 3.0, 1.5, 0.5],
        ),
    ))

    # Pain level 1-10
    config_builder.add_column(dd.SamplerColumnConfig(
        name="pain_level",
        sampler_type="uniform",
        params=dd.UniformSamplerParams(low=1, high=10),
        convert_to="int",
    ))

    # Duration category
    config_builder.add_column(dd.SamplerColumnConfig(
        name="duration_category",
        sampler_type="category",
        params=dd.CategorySamplerParams(
            values=["Acute (less than 3 days)", "Subacute (3-14 days)", "Chronic (more than 14 days)"],
            weights=[2.0, 2.5, 1.5],
        ),
    ))

    # Generate symptom profile (primary symptom, additional symptoms, urgency)
    config_builder.add_column(dd.LLMStructuredColumnConfig(
        name="symptom_profile",
        model_alias="nvidia-text",
        output_format=SymptomProfile,
        prompt="Generate a realistic medical symptom profile for a patient.\n\nBody region: {{ body_region }}\nSeverity: {{ severity }}\nPain level: {{ pain_level }}/10\nDuration: {{ duration_category }}\nPatient age: {{ patient_age }}\nPatient sex: {{ patient_sex }}\n\nProvide a specific primary symptom and 2-4 additional symptoms that are clinically plausible for this body region and severity level.",
        system_prompt="You are a medical triage data generator. Generate realistic, clinically plausible symptom combinations. Each combination should be diverse and cover a wide range of conditions for the given body region. Do not always pick the most common condition — vary across rare and common presentations.",
    ))

    # Natural language patient description
    config_builder.add_column(dd.LLMTextColumnConfig(
        name="description",
        model_alias="nvidia-text",
        prompt="Write a first-person patient description (2-3 sentences) describing their symptoms as they would report them to a nurse or doctor.\n\nPatient: {{ patient_sex }}, age {{ patient_age }}\nBody region: {{ body_region }}\nPrimary symptom: {{ symptom_profile.primary_symptom }}\nAdditional symptoms: {{ symptom_profile.additional_symptoms }}\nSeverity: {{ severity }}\nPain level: {{ pain_level }}/10\nDuration: {{ duration_category }}\n\nWrite naturally as a patient would speak. Include how the symptoms affect daily life.",
        system_prompt="You generate realistic patient symptom descriptions. Write in a natural, conversational tone as a patient describing their condition. Vary sentence structure and detail level.",
    ))

    # Query variations
    config_builder.add_column(dd.LLMStructuredColumnConfig(
        name="query_variations",
        model_alias="nvidia-text",
        output_format=QueryVariations,
        prompt="Generate 5-10 conversational query variations a layperson might use to describe the following condition.\n\nBody region: {{ body_region }}\nPrimary symptom: {{ symptom_profile.primary_symptom }}\nAdditional symptoms: {{ symptom_profile.additional_symptoms }}\nSeverity: {{ severity }}\n\nWrite these as natural language search queries or chat messages. Use colloquialisms and avoid strict medical jargon.",
        system_prompt="You generate diverse, realistic patient queries. Think about how real people search for medical help when they don't know the exact diagnosis."
    ))

    return config_builder
