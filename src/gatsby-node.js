const { default: createNodeHelpers } = require('gatsby-node-helpers');
const { createRemoteFileNode } = require('gatsby-source-filesystem');
const { Simplecast } = require('./lib/Simplecast');

const { createNodeFactory } = createNodeHelpers({ typePrefix: `Simplecast` });

const PodcastNode = createNodeFactory('Podcast', (node) => node);
const SeasonNode = createNodeFactory('Season', (node) => node);
const EpisodeNode = createNodeFactory('Episode', (node) => node);

const PLUGIN_NAME = '@sergeysova/gatsby-source-simplecast';
const DEFAULTS = {
  fetchLimit: 99,
};

exports.sourceNodes = async (
  { actions: { createNode, setPluginStatus }, createContentDigest },
  { token, podcastId, fetchLimit = DEFAULTS.fetchLimit }
) => {
  const errorAboutGatsbyPlugins =
    'To learn more about configuring Gatsby plugins, visit at https://www.gatsbyjs.org/docs/using-a-plugin-in-your-site/.';
  const errorAboutSimplecastAuth =
    'To learn more about Simplecast authentication, visit https://help.simplecast.com/en/articles/2724796-simplecast-2-0-api.';
  const errorAboutPodcastId = `To get your podcast ID, login to Simplecast, click 'Show Settings' from your account dashboard.`;

  if (!token)
    throw new Error(
      `It looks like you forgot your Simplecast Auth token! Make sure to pass your token into '${PLUGIN_NAME}' options in 'gatsby-config.js'. \n${errorAboutSimplecastAuth} \n${errorAboutGatsbyPlugins}`
    );
  if (!podcastId)
    throw new Error(
      `It looks like you forgot your Simplecast Podcast ID! Make sure to pass the ID into '${PLUGIN_NAME}' options in 'gatsby-config.js'. \n${errorAboutPodcastId} \n${errorAboutGatsbyPlugins}`
    );

  try {
    const sc = new Simplecast({ token, podcastId });
    const [episodes, podcast, seasons] = await Promise.all([
      sc.getEpisodes(fetchLimit),
      sc.getPodcast(),
      sc.getSeasons(fetchLimit),
    ]);

    await createNode(PodcastNode(podcast));

    await Promise.all(
      episodes
        .map((episode) => EpisodeNode(episode))
        .map((node) => createNode(node))
    );

    await Promise.all(
      seasons
        .map((season) => SeasonNode(season))
        .map((node) => createNode(node))
    );

    setPluginStatus({ lastFetched: Date.now() });
  } catch (err) {
    console.error('FAIL:', err);
  }
};

const nodeWithImage = [
  'SimplecastEpisode',
  'SimplecastSeason',
  'SimplecastPodcast',
];

exports.onCreateNode = async ({
  node,
  actions,
  store,
  cache,
  createNodeId,
}) => {
  if (nodeWithImage.includes(node.internal.type) && node.imageUrl) {
    const fileNode = await createRemoteFileNode({
      url: node.imageUrl,
      parentNodeId: node.id,
      createNode: actions.createNode,
      createNodeId,
      cache,
      store,
    });

    if (fileNode) {
      node.image___NODE = fileNode.id;
    }
  }
};

exports.createSchemaCustomization = ({ actions, schema }) => {
  actions.createTypes(`
    type SimplecastEpisode implements Node {
      image: File @link(from: "image___NODE")
      season: SimplecastSeason @link(by: "number", from: "seasonNumber")
    }

    type SimplecastPodcast implements Node {
      image: File @link(from: "image___NODE")
      seasons: [SimplecastSeason] @link(by: "podcastId", from: "simplecastId")
    }
  `);

  actions.createTypes([
    `type SimplecastSeason implements Node {
        podcast: SimplecastPodcast
        episodes: [SimplecastEpisode] @link(by: "seasonNumber", from: "number")
      }`,
    schema.buildObjectType({
      name: 'SimplecastSeason',
      fields: {
        podcast: {
          type: 'SimplecastPodcast',
          resolve(source, args, context, info) {
            return context.nodeModel
              .getAllNodes({ type: 'SimplecastPodcast' })
              .find((podcast) => Boolean(podcast));
          },
        },
      },
    }),
  ]);
};
