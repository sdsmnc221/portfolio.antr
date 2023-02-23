const adapter = (data, alt) => {
  return {
    filename: data?.url || '',
    alt: data?.alt || alt,
    size: {
      width: data?.info?.img_w || null,
      height: data?.info?.img_h || null,
    },
  };
};

export default adapter;
