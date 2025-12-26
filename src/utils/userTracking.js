/**
 * Extract user tracking information from request
 * This runs silently without user knowledge
 */
const getUserTrackingInfo = (req) => {
  // Get IP address
  const getIpAddress = () => {
    return (
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  };

  // Parse User-Agent
  const parseUserAgent = (userAgent) => {
    if (!userAgent) return {};

    const ua = userAgent.toLowerCase();
    let deviceType = 'desktop';
    let platform = 'unknown';
    let browser = 'unknown';
    let os = 'unknown';

    // Device type
    if (ua.includes('mobile') || ua.includes('android')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    }

    // Platform
    if (ua.includes('android')) {
      platform = 'android';
      os = 'Android';
    } else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
      platform = 'ios';
      os = 'iOS';
    } else if (ua.includes('windows')) {
      platform = 'windows';
      os = 'Windows';
    } else if (ua.includes('mac')) {
      platform = 'mac';
      os = 'macOS';
    } else if (ua.includes('linux')) {
      platform = 'linux';
      os = 'Linux';
    }

    // Browser
    if (ua.includes('chrome') && !ua.includes('edg')) {
      browser = 'Chrome';
    } else if (ua.includes('firefox')) {
      browser = 'Firefox';
    } else if (ua.includes('safari') && !ua.includes('chrome')) {
      browser = 'Safari';
    } else if (ua.includes('edg')) {
      browser = 'Edge';
    } else if (ua.includes('opera') || ua.includes('opr')) {
      browser = 'Opera';
    }

    return {
      deviceType,
      platform,
      browser,
      os,
    };
  };

  const ipAddress = getIpAddress();
  const userAgent = req.headers['user-agent'] || '';
  const parsedUA = parseUserAgent(userAgent);

  return {
    ipAddress,
    deviceInfo: {
      userAgent,
      ...parsedUA,
    },
    appVersion: req.headers['x-app-version'] || null,
    appPlatform: req.headers['x-app-platform'] || parsedUA.platform,
    networkInfo: {
      connectionType: req.headers['x-connection-type'] || null,
      isp: null, // Can be populated from IP geolocation service
    },
  };
};

/**
 * Get location from IP (simplified - can be enhanced with IP geolocation service)
 * For production, use services like ipapi.co, ip-api.com, or maxmind
 */
const getLocationFromIp = async (ipAddress) => {
  // In production, you would call an IP geolocation service here
  // For now, return basic structure
  // Example: const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`);
  
  return {
    country: null,
    region: null,
    city: null,
    latitude: null,
    longitude: null,
    timezone: null,
  };
};

module.exports = {
  getUserTrackingInfo,
  getLocationFromIp,
};

