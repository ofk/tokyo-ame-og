const { URL } = require('url');
const fetch = require('node-fetch');

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

const indexPage = (url) => fetch(`https://tokyo-ame.jwa.or.jp/scripts/mesh_index.js?${Math.round(Date.now() / 150000)}`)
      .then((res) => res.text())
      .then((res) => {
        const mt = /"(.*?)"/.exec(res);
        const md = mt ? /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(mt[1]) : null;
        return renderOgPage({
          type: 'website',
          image: mt ? `${url.origin}/image?t=${mt[1]}` : null,
          url: 'https://tokyo-ame.jwa.or.jp/',
          title: 'amesh now',
          description: md ? `${md[1]}-${md[2]}-${md[3]} ${md[4]}:${md[5]}` : 'Umm.',
        });
      });

module.exports = (req, res) => {
  const url = new URL(`${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}${req.url}`);

  switch (url.pathname) {
    case '/':
      indexPage(url).then((data) => {
        res.send(data);
      });
      break;
    default:
      res.status(404).send('Not Found');
      break;
  }
};
