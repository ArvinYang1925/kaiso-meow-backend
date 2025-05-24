import { AppDataSource } from "../config/db";
import { Section } from "../entities/Section";

export const reorderSections = async (courseId: string): Promise<void> => {
  const sectionRepo = AppDataSource.getRepository(Section);

  const sections = await sectionRepo.find({
    where: {
      course: { id: courseId },
    },
    order: {
      orderIndex: "ASC",
    },
  });

  for (let i = 0; i < sections.length; i++) {
    if (sections[i].orderIndex !== i + 1) {
      sections[i].orderIndex = i + 1;
    }
  }

  await sectionRepo.save(sections);
};
