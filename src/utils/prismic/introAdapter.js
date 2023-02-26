export default function (data, prismic) {
  if (!data) return null;

  return {
    head: prismic.asHTML(data.primary?.intro_title),
    shortText: prismic.asHTML(data.primary?.short_text),
    qualityTerms: data.primary?.quality_terms?.map(({ text }) => text),
  };
}
