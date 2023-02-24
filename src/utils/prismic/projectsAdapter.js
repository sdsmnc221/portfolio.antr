import * as prismicClient from '@prismicio/client';

import imageAdapter from './imageAdapter';

const getDescription = async (projectID, prismicClient) => {
  const doc = await prismicClient.getByID(projectID);
  return doc?.data?.description;
};

export default async function (data, prismic) {
  const client = prismicClient.createClient(import.meta.env.VITE_PRISMIC_REPOSITORY);
  const result = [];

  for (const project of data) {
    const { data, id, tags } = project.projet;

    const description = await getDescription(id, client);
    const previewContent = prismic.asHTML(description);
    result.push({
      previewTitle: data.title,
      previewImages: data.preview_images.map(({ cell_image }) => imageAdapter(cell_image)),
      previewContent,
      previewVideo: data.video,
      previewHashtags: tags,
      previewLink: data.link,
      rowImages: data.row_images.map(({ cell_image }) => imageAdapter(cell_image)),
      year: data.year,
    });
  }

  return result;
}
