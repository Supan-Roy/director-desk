import re

from app.schemas.responses import StoryboardScene


class StoryboardParser:

    def parse(self, storyboard_text: str):

        scenes = []

        blocks = storyboard_text.split("---")

        for block in blocks:

            block = block.strip()

            if not block:
                continue

            scene_match = re.search(
                r"Scene Number:\s*(\d+)",
                block
            )

            camera_match = re.search(
                r"Camera Shot:\s*(.+)",
                block
            )

            environment_match = re.search(
                r"Environment:\s*(.+)",
                block
            )

            mood_match = re.search(
                r"Mood:\s*(.+)",
                block
            )

            if (
                scene_match
                and camera_match
                and environment_match
                and mood_match
            ):
                scenes.append(
                    StoryboardScene(
                        scene_number=int(scene_match.group(1)),
                        camera_shot=camera_match.group(1).strip(),
                        environment=environment_match.group(1).strip(),
                        mood=mood_match.group(1).strip()
                    )
                )

        return scenes


storyboard_parser = StoryboardParser()