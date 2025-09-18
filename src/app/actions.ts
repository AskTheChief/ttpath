'use server';

import { revalidatePath } from 'next/cache';
import { getUserData, updateUserData } from '@/lib/db';
import type { Level, Requirement } from '@/lib/types';
import { levels } from '@/lib/types';

export async function fetchUserData() {
  return await getUserData();
}

export async function completeRequirement(requirementId: Requirement) {
  const user = await getUserData();
  user.completedRequirements[requirementId] = true;
  await updateUserData(user);
  revalidatePath('/');
  return user;
}

export async function setLevel(newLevel: Level) {
  const user = await getUserData();
  if (levels.includes(newLevel)) {
    user.level = newLevel;
    await updateUserData(user);
    revalidatePath('/');
    return user;
  }
  throw new Error('Invalid level');
}
