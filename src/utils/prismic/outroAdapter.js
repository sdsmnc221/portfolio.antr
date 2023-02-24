import imageAdapter from './imageAdapter';

export default function (data, tags) {
  if (!data) return null;

  return {
    hashtagsTitle: data.primary?.outro_title,
    hashtags: tags,
    resumeTitle: data.primary?.resume_title,
    resumeLink: data.primary?.resume_link?.url,
    resumeQR: imageAdapter(data.primary?.resume_qr),
    contactTitle: data.primary?.contact_title,
    contactLink: data.primary?.contact_link?.url,
  };
}
