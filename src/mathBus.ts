/** Champ de saisie actif : la palette LaTeX insère toujours dans le dernier champ où l'on a cliqué. */
export type FieldHandle = {
  insert: (tex: string) => void;
  wrap: (delim: "$" | "$$") => void;
};

let active: FieldHandle | null = null;

export const setActiveField = (handle: FieldHandle | null) => { active = handle; };
export const clearActiveField = (handle: FieldHandle) => { if (active === handle) active = null; };
export const getActiveField = () => active;
