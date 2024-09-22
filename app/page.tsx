import { getApi } from '@agility/content-fetch';
import { z } from 'zod';
import parse, { HTMLReactParserOptions } from 'html-react-parser';

const FieldsSchema = z.object({
  title: z.string(),
  slug: z.string(),
  date: z.string(), // Assuming this is an ISO date string
  content: z.string(),
});

const ItemSchema = z.object({
  contentID: z.number(),
  fields: FieldsSchema, // Only care about specific fields
});

const AgilityResponseSchema = z.object({
  items: z.array(ItemSchema), // Array of items
});

// Infer TypeScript types from Zod schemas
type AgilityResponse = z.infer<typeof AgilityResponseSchema>;
type Post = z.infer<typeof ItemSchema>;

async function getData(): Promise<AgilityResponse> {
  const api = getApi({
    guid: process.env.AGILITY_GUID!,
    apiKey: process.env.AGILITY_API_KEY!,
  });

  const response = await api.getContentList({
    referenceName: 'posts',
    languageCode: 'en-us',
  });

  // Validate the JSON data against the Zod schema
  const result = AgilityResponseSchema.safeParse(response);

  if (!result.success) {
    console.error('Validation failed:', result.error);
    throw new Error('Invalid data format');
  }
  console.log(result.data);
  return result.data; // This is now type-safe and validated data
}

// HTMLReactParser options
// Custom transform function to add Tailwind CSS classes
const transform: HTMLReactParserOptions['replace'] = (node) => {
  if (node.type === 'tag') {
    const element = node as { name: string; attribs: { class?: string } };
    switch (element.name) {
      case 'h2':
        element.attribs.class =
          (element.attribs.class || '') + ' text-2xl font-bold';
        break;
      case 'p':
        element.attribs.class =
          (element.attribs.class || '') + ' text-red-400 mb-4 text-center';
        break;
      case 'img':
        element.attribs.class =
          (element.attribs.class || '') + ' items-center rounded-lg';
        break;
      // Add more cases as needed
    }
  }
  return node;
};

export default async function Home() {
  const r = await getData();

  const posts: Post[] = Array.isArray(r.items) ? r.items : [];

  return (
    <main>
      <h1>Agility CMS Blog</h1>
      <ul>
        {posts.map((post: Post) => (
          <li key={post.contentID}>
            <h5>{post.fields.title}</h5>
            <div className='flex flex-col justify-center items-center'>
              {parse(post.fields.content, { replace: transform })}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
