import { z } from "zod";

const imageUrl = z.string().max(2048).refine(value => value === "" || /^https?:\/\//.test(value) || /^\/(?!\/)/.test(value));
export const portfolioInput = z.object({
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(20000),
    category: z.string().trim().max(100),
    eventDate: z.string().trim().max(30),
    coverImage: imageUrl,
    images: z.array(z.object({
        id: z.string().max(200).optional(), url: imageUrl,
        key: z.string().max(2048).optional(), name: z.string().max(500).optional(),
        alt: z.string().max(1000).optional(), width: z.number().nonnegative().optional(),
        height: z.number().nonnegative().optional(), order: z.number().int().nonnegative().optional(),
    })).max(1000),
    featured: z.boolean(), status: z.enum(["active", "inactive"]),
});
