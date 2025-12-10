const axios = require('axios');
const { logger } = require('../config/logger');

const atlasConfig = () => {
  const {
    ATLAS_PUBLIC_KEY,
    ATLAS_PRIVATE_KEY,
    ATLAS_PROJECT_ID,
    ATLAS_CLUSTER_NAME,
    ATLAS_API_BASE
  } = process.env;

  if (!ATLAS_PUBLIC_KEY || !ATLAS_PRIVATE_KEY || !ATLAS_PROJECT_ID || !ATLAS_CLUSTER_NAME) {
    throw new Error('Atlas API credentials are not fully configured (missing public/private key, project ID, or cluster name).');
  }

  return {
    publicKey: ATLAS_PUBLIC_KEY,
    privateKey: ATLAS_PRIVATE_KEY,
    projectId: ATLAS_PROJECT_ID,
    clusterName: ATLAS_CLUSTER_NAME,
    baseUrl: ATLAS_API_BASE || 'https://cloud.mongodb.com'
  };
};

const atlasClient = () => {
  const cfg = atlasConfig();
  return axios.create({
    baseURL: `${cfg.baseUrl}/api/atlas/v2/groups/${cfg.projectId}`,
    auth: { username: cfg.publicKey, password: cfg.privateKey },
    timeout: 10000
  });
};

// Fetch the latest snapshot metadata for the cluster
async function getLatestSnapshot() {
  const cfg = atlasConfig();
  const client = atlasClient();

  const url = `/clusters/${cfg.clusterName}/backup/snapshots`;
  const params = { limit: 1, sort: 'createdAt', order: 'desc' };

  try {
    const { data } = await client.get(url, { params });
    const snapshot = data?.results?.[0];

    if (!snapshot) {
      logger.warn('[AtlasBackup] No snapshots returned by Atlas API');
      return null;
    }

    return {
      id: snapshot.id,
      clusterName: cfg.clusterName,
      createdAt: snapshot.createdAt,
      expiresAt: snapshot.expiresAt,
      type: snapshot.type,
      status: snapshot.status,
      complete: snapshot.complete,
      links: snapshot.links
    };
  } catch (err) {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail || err?.response?.data?.error || err.message;
    logger.warn(`[AtlasBackup] Snapshot lookup failed (status ${status || 'unknown'}): ${detail}`);
    throw new Error(detail || 'Atlas snapshot lookup failed');
  }
}

module.exports = {
  getLatestSnapshot
};
