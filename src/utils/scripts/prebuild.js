import * as prismic from '@prismicio/client';
import fs from 'fs';

async function fetchAndSaveData() {
  const client = prismic.createClient('porforlio-antr');

  // Fetch homepage with linked project documents
  const data = await client.getByType('homepage', {
    fetchLinks: [
      'project.title',
      'project.row_images',
      'project.preview_images',
      'project.description',
      'project.video',
      'project.link',
      'project.year',
      'project.display_images',
    ],
  });

  // Also fetch all projects to ensure we have complete data
  const projects = await client.getAllByType('project');

  // Save both sets of data
  fs.writeFileSync(
    './src/assets/prismic-data.json',
    JSON.stringify(
      {
        homepage: data,
        projects: projects,
      },
      null,
      2
    )
  );
}

fetchAndSaveData().catch(console.error);
