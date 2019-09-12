const { URL } = require('url');

const h = (str) => `${str}`.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const renderOgPage = (data) => {
  const ogContents = ['type', 'title', 'description', 'image', 'url', 'site_name']
        .filter((key) => data[key])
        .map((key) => `<meta property="og:${key}" content="${h(data[key])}">`);
  const titleContent = data.url ? `<a href="${h(data.url)}">${h(data.title)}</a>` : h(data.title);
  const descriptionContent = data.description ? `<p>${h(data.description)}</p>` : '';
  const imageContent = data.image ? `<p><img src="${h(data.image)}"></p>` : '';
  return `<!DOCTYPE html>
<html>
<head>
<title>${h(data.title)}</title>
${ogContents.join('\n')}
</head>
<body>
<h1>${titleContent}</h1>
${descriptionContent}
${imageContent}
</body>
</html>`;
};

module.exports = (req, res) => {
  const url = new URL(`${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}${req.url}`);

  switch (url.pathname) {
    case '/':
      res.send(renderOgPage({
        type: 'website',
        image: `${url.origin}/image`,
        url: 'https://tokyo-ame.jwa.or.jp/',
        title: 'amesh now',
        description: `YYYY-MM-DD HH:MM`,
      }));
      break;
    default:
      res.status(404).send('Not Found');
      break;
  }
};
