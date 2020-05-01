const fetch = require('node-fetch');
const { unSlashIt, camelCaseKeys } = require('./utils');

class Simplecast {
  constructor({ token, podcastId }) {
    this.token = token;
    this.podcastId = podcastId;
    this.headers = {
      'Access-Control-Allow-Origin': '*',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
    this.baseUrl = `https://api.simplecast.com`;
  }

  setHeaders = (headers = {}) => {
    // extract auth values to avoid potential bugs
    const { Authorization, authorization, ...newHeaders } = headers;
    const { headers: currentHeaders } = this;
    this.headers = {
      ...currentHeaders,
      ...newHeaders,
    };
  };

  request = (path = '', params = {}, method = 'GET') => {
    // TODO: let query = qs.stringify(params) || '';
    const url = this.baseUrl + '/' + unSlashIt(path);
    return fetch(url, {
      method,
      headers: this.headers,
      cache: 'default',
    });
  };

  getEpisode = episodeId => {
    if (!episodeId) {
      throw Error('No episode ID provided.');
    }
    return this.request(`episodes/${this.podcastId}/episodes`)
      .then(res => res.json())
      .then(data => camelCaseKeys(data, { deep: true }))
      .catch(console.error);
  };

  getShowInfo = () => {
    return this.request(`podcasts/${this.podcastId}`)
      .then(res => res.json())
      .then(data => camelCaseKeys(data, { deep: true }))
      .catch(console.error);
  };

  getEpisodes = (limit = 10) => {
    return this.request(
      `podcasts/${this.podcastId}/episodes?limit=${
        typeof limit === 'number' ? limit : 10
      }`
    )
      .then(res => res.json())
      .then(info => info.collection)
      .then(data => camelCaseKeys(data, { deep: true }))
      .catch(console.error);
  };

  getPodcast = () => {
    return this.request(`podcasts/${this.podcastId}`)
      .then(res => res.json())
      .then(info => ({
        copyright: info.copyright,
        created_at: info.created_at,
        description: info.description,
        feed_url: info.feed_url,
        id: info.id,
        image_path: info.image_path,
        image_url: info.image_url,
        keywords: info.keywords.collection,
        language: info.language,
        logo_image_url: info.logo_image_url,
        owner: info.owner,
        published_at: info.published_at,
        site: info.site,
        subtitle: info.subtitle,
        time_zone: info.time_zone,
      }))
      .then(data => camelCaseKeys(data, { deep: true }))
      .catch(console.error);
  }

  // getSeasons = (podcastId, limit = 10) => {
  //   return this.request(`podcasts/${podcastId}`)
  // }
}

module.exports = Simplecast;
