from app.services.qwen_service import qwen_service


class WriterAgent:

    def generate_script(self, prompt: str, production_type: str = "Short Film"):
        is_audio = production_type in ["Podcast", "Audio Story"]
        
        format_guidelines = f"Create a script for a {production_type}."
        if production_type == "Podcast":
            format_guidelines += "\nInclude host and guest dialogues. Focus on conversations, audio transitions, and sound markers. Do NOT include any camera directions, shots, or visual descriptions."
        elif production_type == "Audio Story":
            format_guidelines += "\nInclude narrator descriptions, voice lines, and sound effect (SFX) directions. Do NOT include camera shots or visual framing."
        else:
            format_guidelines += "\nStructure it with clear scenes (e.g. SCENE 1: ...), visual action cues, and dialogue lines. Include camera shots or directions if helpful."

        writer_prompt = f"""
        You are a Writer Agent in a production studio.
        Based on the user concept, write a script for a {production_type}.

        Concept:
        {prompt}

        Guidelines:
        {format_guidelines}

        Return 5 to 7 detailed scenes or sections. Use standard dialogue blocks starting with '>'.
        """
        script = qwen_service.generate_text(writer_prompt)
        return script


writer_agent = WriterAgent()