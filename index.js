const { URL, URLSearchParams } = require('url');
const fetch = require('node-fetch');
const { createCanvas, loadImage } = require('canvas');

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

const mergeImages = (images, w, h, x, y) => {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const widthRatio = canvas.width / images[0].width;
  const heightRatio = canvas.height / images[0].height;
  images.forEach((image) => {
    ctx.drawImage(
      image,
      image.width * (x - widthRatio / 2),
      image.height * (y - heightRatio / 2),
      image.width * widthRatio,
      image.height * heightRatio,
      0, 0, canvas.width, canvas.height
    );
  });
  return canvas;
};

const indexPage = (url) => fetch(`https://tokyo-ame.jwa.or.jp/scripts/mesh_index.js?${Math.round(Date.now() / 150000)}`)
      .then((res) => res.text())
      .then((res) => {
        const mt = /"(\d{12})"/.exec(res);
        return mt ? mt[1] : Promise.reject();
      })
      .then((res) => Promise.all([
        Promise.resolve(res),
        loadImage(`https://tokyo-ame.jwa.or.jp/mesh/100/${res}.gif`),
      ]))
      .then(([res, img]) => {
        const params = new URLSearchParams();
        params.append('t', res);
        ['x', 'y'].forEach((k) => {
          if (url.searchParams.has(k)) {
            params.append(k, url.searchParams.get(k));
          }
        });

        const x = parseFloat(url.searchParams.get('x')) || 0.6;
        const y = parseFloat(url.searchParams.get('y')) || 0.5;
        const canvas = mergeImages([img], 600, 315, x, y);
        const ctx = canvas.getContext('2d');
        const imData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let count = 0;
        for (let i = 0; i < imData.data.length; i += 4) {
          if (imData.data[i + 3]) {
            count += 1;
          }
        }

        const m = res ? /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/.exec(res) : null;
        return {
          image: `${url.origin}/image?${params}`,
          description: m ? `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]} (${((count * 100) / (canvas.width * canvas.height)).toFixed(2)}%)` : 'Umm.',
        };
      })
      .catch(() => ({
        image: null,
        description: 'Umm.',
      }))
      .then((data) => renderOgPage({
        ...data,
        type: 'website',
        url: 'https://tokyo-ame.jwa.or.jp/',
        title: 'amesh now',
      }));

const imagePage = (url) => Promise.all([
  loadImage('https://tokyo-ame.jwa.or.jp/map/map150.jpg'),
  loadImage(`https://tokyo-ame.jwa.or.jp/mesh/100/${url.searchParams.get('t')}.gif`),
  loadImage('https://tokyo-ame.jwa.or.jp/map/msk150.png'),
]).then((images) => {
  const x = parseFloat(url.searchParams.get('x')) || 0.6;
  const y = parseFloat(url.searchParams.get('y')) || 0.5;
  return mergeImages(images, 1200, 630, x, y).toBuffer();
});

module.exports = (req, res) => {
  const url = new URL(`${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}${req.url}`);

  switch (url.pathname) {
    case '/':
      if (process.env.NODE_ENV !== 'development' && !/Slackbot-LinkExpanding/.test(req.headers['user-agent'])) {
        res.writeHead(302, 'Redirect', { Location: 'https://tokyo-ame.jwa.or.jp/' });
        res.end();
        return;
      }
      indexPage(url).then((data) => {
        res.send(data);
      });
      break;
    case '/now':
      const params = new URLSearchParams(url.searchParams);
      params.append('_', Date.now());
      res.writeHead(302, 'Redirect', { Location: `/?${params}` });
      res.end();
      break;
    case '/image':
      if (url.searchParams.get('t')) {
        imagePage(url).then((data) => {
          res.end(data);
        });
      } else {
        res.status(500).send('Internal Server Error');
      }
      break;
    default:
      res.status(404).send('Not Found');
      break;
  }
};
