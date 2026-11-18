import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";

/** Extensions shared by the browser editor and the server-side importer so both agree on the schema. */
export const sharedExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];
