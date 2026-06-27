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
            format_guidelines += (
                "\nStructure it with clear scenes (e.g. SCENE 1: ...), visual action cues, and dialogue lines. Include camera shots or directions if helpful. "
                "\nCRITICAL DURATION RULES: Break down the story into distinct, consecutive scenes where each scene describes a concise narrative beat designed to fit exactly within a 10 to 15 second duration. "
                "Do not write long, sprawling scenes. If a scene contains too much action, motion, or dialogue, split it into multiple smaller consecutive scenes (e.g., SCENE 1, SCENE 2) of 10 or 15 seconds each so they can be generated properly by the AI video model."
            )

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