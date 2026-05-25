import { USE_MOCK_DATA } from '@/lib/firebase';
import { MOCK_PROJECTS } from '@/data/mock';
import type { Project } from '@/types';

export async function listProjects(orgId: string): Promise<Project[]> {
  if (USE_MOCK_DATA) {
    return MOCK_PROJECTS.filter((p) => p.orgId === orgId);
  }
  // 🔌 FIREBASE
  // const snap = await getDocs(collection(db!, `organizations/${orgId}/projects`));
  // return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
  return [];
}

export async function createProject(project: Project): Promise<Project> {
  // 🔌 FIREBASE
  // const ref = await addDoc(collection(db!, `organizations/${project.orgId}/projects`), project);
  // return { ...project, id: ref.id };
  return project;
}
