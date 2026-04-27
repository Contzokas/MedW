# /// script
# dependencies = [
#   "data-designer",
#   "pydantic"
# ]
# ///
import data_designer.config as dd
from pydantic import BaseModel, Field

class TriageScenario(BaseModel):
    patient_presentation: str = Field(description="A realistic medical vignette detailing the patient's presentation, age-appropriate symptoms, and vital signs.")
    triage_question: str = Field(description="A simulated benchmark question asking the RAG system to classify the patient based on MTS guidelines.")
    expected_triage_level: int = Field(description="The correct MTS Level (1-5) according to the Manchester Triage System.")
    expected_rationale: str = Field(description="Detailed rationale citing the exact MTS rules used, quoting the guidelines where applicable.")

MTS_GUIDELINES = """
## MTS Level 1 — Immediate
Life-threatening conditions requiring immediate intervention.
Symptoms: cardiac arrest, no breathing, unconscious/unresponsive, severe anaphylaxis with airway compromise, uncontrolled major haemorrhage, eclampsia.

## MTS Level 2 — Very Urgent — Target: 10 minutes
Conditions presenting significant risk of deterioration.
Symptoms: chest pain with radiation to arm/jaw, suspected stroke (facial droop, arm weakness, speech difficulty), severe difficulty breathing, altered mental status, severe allergic reaction, active moderate bleeding, seizures, severe abdominal pain with rigidity, suspected sepsis with fever and confusion.

## MTS Level 3 — Urgent — Target: 30 minutes
Moderate conditions requiring prompt attention.
Symptoms: moderate chest pain, moderate shortness of breath, high fever (>38.5°C) in adults, persistent vomiting or diarrhea with dehydration signs, significant pain (5–7/10), moderate lacerations, headache with neck stiffness, urinary symptoms with fever, back pain with neurological signs.

## MTS Level 4 — Less Urgent — Target: 1 hour
Minor conditions that need attention but are not immediately dangerous.
Symptoms: mild pain (1–4/10), minor lacerations, sore throat, mild fever (<38.5°C), ear pain, mild headache without neurological signs, minor musculoskeletal injuries, skin rashes without systemic symptoms, urinary symptoms without fever.

## MTS Level 5 — Non-urgent — Target: 2 hours
Conditions that can safely wait for assessment.
Symptoms: chronic conditions without acute exacerbation, minor complaints, prescription refills, minor skin irritation, well-controlled chronic pain, follow-up queries.

## Key MTS Discriminators
- Pain severity (0–10 scale) is a primary discriminator across all levels.
- Airway compromise or respiratory distress always escalates to Level 1 or 2.
- Fever in infants under 3 months is Level 2 regardless of other symptoms.
- Mechanism of injury (trauma) can escalate triage level.
- Mental status changes always warrant Level 2 or higher.
"""

def load_config_builder() -> dd.DataDesignerConfigBuilder:
    config_builder = dd.DataDesignerConfigBuilder()

    config_builder.add_column(
        column_config=dd.SamplerColumnConfig(
            name="patient_demographics",
            sampler_type="category",
            params=dd.CategorySamplerParams(
                values=[
                    "Infant under 3 months", 
                    "Toddler/Child", 
                    "Adult (18-64)", 
                    "Elderly (65+)"
                ]
            )
        )
    )

    config_builder.add_column(
        column_config=dd.SamplerColumnConfig(
            name="symptom_category",
            sampler_type="category",
            params=dd.CategorySamplerParams(
                values=[
                    "Cardiac", 
                    "Respiratory", 
                    "Trauma", 
                    "Neurological", 
                    "Infection/Fever", 
                    "Gastrointestinal", 
                    "Generic Pain"
                ]
            )
        )
    )

    config_builder.add_column(
        column_config=dd.LLMStructuredColumnConfig(
            name="triage_scenario",
            model_alias="nvidia-text",
            output_format=TriageScenario,
            system_prompt=f"You are an expert clinical triage nurse and medical educator. You create realistic, challenging but unambiguous patient vignettes to test a RAG system's knowledge of the Manchester Triage System (MTS). Use the following guidelines to inform the cases:\n{MTS_GUIDELINES}",
            prompt="Generate a unique, realistic triage scenario for a {{ patient_demographics }} presenting with an issue in the {{ symptom_category }} category. Ensure it clearly maps to exactly one MTS level (between 1 and 5)."
        )
    )

    # Flatten the structured column into individual columns for the final dataset
    config_builder.add_column(
        column_config=dd.ExpressionColumnConfig(
            name="patient_presentation",
            expr="{{ triage_scenario.patient_presentation }}"
        )
    )
    config_builder.add_column(
        column_config=dd.ExpressionColumnConfig(
            name="triage_question",
            expr="{{ triage_scenario.triage_question }}"
        )
    )
    config_builder.add_column(
        column_config=dd.ExpressionColumnConfig(
            name="expected_triage_level",
            expr="{{ triage_scenario.expected_triage_level }}"
        )
    )
    config_builder.add_column(
        column_config=dd.ExpressionColumnConfig(
            name="expected_rationale",
            expr="{{ triage_scenario.expected_rationale }}"
        )
    )

    # Drop the intermediate structured column and helper columns if you only want the text output
    config_builder.add_processor(
        processor_config=dd.DropColumnsProcessorConfig(
            name="drop_original_scenario",
            column_names=["triage_scenario"]
        )
    )

    return config_builder
