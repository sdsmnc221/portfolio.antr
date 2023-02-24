import imageAdapter from './imageAdapter';

export default function (data, prismic) {
  return data.map(({ projet }) => {
    const { data, tags } = projet;

    return {
      previewTitle: data.title,
      previewImages: data.preview_images.map(({ cell_image }) => imageAdapter(cell_image)),
      previewContent: prismic.asHTML(data.description),
      previewVideo: data.video,
      previewHashtags: tags,
      previewLink: data.link,
      rowImages: data.row_images.map(({ cell_image }) => imageAdapter(cell_image)),
      year: data.year,
    };
  });
}
