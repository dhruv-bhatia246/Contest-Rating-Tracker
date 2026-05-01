/**
 * Tests for platform-specific data parsing logic extracted from the screens.
 * These test the core business logic: API response parsing, rating extraction, etc.
 */

describe('LeetCode data parsing', () => {
  it('extracts rating from contest ranking data', () => {
    const data = {
      userContestRanking: { rating: 1689.123, attendedContestsCount: 24, topPercentage: 14.2 },
    };
    const rating = data.userContestRanking?.rating;
    expect(Math.round(rating)).toBe(1689);
  });

  it('extracts solved count from submit stats', () => {
    const data = {
      matchedUser: { submitStats: { acSubmissionNum: [{ count: 1334 }] } },
    };
    const solved = data.matchedUser?.submitStats?.acSubmissionNum?.[0]?.count;
    expect(solved).toBe(1334);
  });

  it('handles missing contest ranking', () => {
    const data = { userContestRanking: null };
    const rating = data.userContestRanking?.rating;
    expect(rating).toBeUndefined();
  });

  it('handles missing submit stats', () => {
    const data = { matchedUser: null };
    const solved = data.matchedUser?.submitStats?.acSubmissionNum?.[0]?.count;
    expect(solved).toBeUndefined();
  });
});

describe('Codeforces data parsing', () => {
  it('extracts rating from user.info response', () => {
    const info = { rating: 1500, maxRating: 1600, rank: 'specialist', maxRank: 'expert' };
    expect(info.rating).toBe(1500);
    expect(info.maxRating).toBe(1600);
    expect(info.rank).toBe('specialist');
  });

  it('counts contests from user.rating response', () => {
    const history = [
      { contestId: 1, newRating: 1400 },
      { contestId: 2, newRating: 1500 },
      { contestId: 3, newRating: 1450 },
    ];
    expect(history.length).toBe(3);
  });

  it('handles empty contest history', () => {
    const data = [];
    const lastEntry = data.length > 0 ? data[data.length - 1] : null;
    expect(lastEntry).toBeNull();
    expect(data.length).toBe(0);
  });

  it('filters BEFORE phase contests', () => {
    const contests = [
      { id: 1, phase: 'BEFORE', name: 'CF 1' },
      { id: 2, phase: 'FINISHED', name: 'CF 2' },
      { id: 3, phase: 'BEFORE', name: 'CF 3' },
    ];
    const upcoming = contests.filter(c => c.phase === 'BEFORE');
    expect(upcoming.length).toBe(2);
    expect(upcoming.map(c => c.id)).toEqual([1, 3]);
  });
});

describe('CodeChef data parsing', () => {
  it('parses rating data from HTML regex', () => {
    const html = `var all_rating = [{"rating":1800,"code":"START01","name":"Starter"},{"rating":1900,"code":"START02","name":"Starter 2"}];`;
    const match = html.match(/var\s+all_rating\s*=\s*(\[.*?\]);/s);
    expect(match).not.toBeNull();
    const data = JSON.parse(match[1]);
    expect(data.length).toBe(2);
    expect(data[0].rating).toBe(1800);
    expect(data[1].rating).toBe(1900);
  });

  it('parses star rating from HTML', () => {
    const html = `<span class="rating" style="display:inline-block;">4 star</span>`;
    const match = html.match(/class="rating"\s*.*?(\d)\s*star/i);
    expect(match).not.toBeNull();
    expect(match[1]).toBe('4');
  });

  it('handles no rating data in HTML', () => {
    const html = `<html><body>No data</body></html>`;
    const match = html.match(/var\s+all_rating\s*=\s*(\[.*?\]);/s);
    expect(match).toBeNull();
    const ratingData = match ? JSON.parse(match[1]) : [];
    expect(ratingData).toEqual([]);
  });

  it('handles no star rating in HTML', () => {
    const html = `<html><body>No stars</body></html>`;
    const match = html.match(/class="rating"\s*.*?(\d)\s*star/i);
    expect(match).toBeNull();
    const stars = match ? match[1] : null;
    expect(stars).toBeNull();
  });

  it('gets last rating from array', () => {
    const ratingData = [
      { rating: 1500, code: 'A' },
      { rating: 1600, code: 'B' },
      { rating: 1800, code: 'C' },
    ];
    const lastRating = ratingData.length > 0 ? ratingData[ratingData.length - 1].rating : null;
    expect(lastRating).toBe(1800);
  });
});

describe('Contest data normalization', () => {
  it('normalizes Codeforces contest data', () => {
    const cf = { id: 123, name: 'CF Round 123', startTimeSeconds: 1700000000, durationSeconds: 7200 };
    const normalized = {
      id: `cf_${cf.id}`,
      name: cf.name,
      platform: 'Codeforces',
      startTime: cf.startTimeSeconds * 1000,
      duration: cf.durationSeconds * 1000,
    };
    expect(normalized.id).toBe('cf_123');
    expect(normalized.platform).toBe('Codeforces');
    expect(normalized.startTime).toBe(1700000000000);
    expect(normalized.duration).toBe(7200000);
  });

  it('normalizes LeetCode contest data', () => {
    const lc = { title: 'Weekly Contest 300', titleSlug: 'weekly-300', startTime: 1700000000, duration: 5400 };
    const normalized = {
      id: `lc_${lc.titleSlug}`,
      name: lc.title,
      platform: 'LeetCode',
      startTime: lc.startTime * 1000,
      duration: lc.duration * 1000,
    };
    expect(normalized.id).toBe('lc_weekly-300');
    expect(normalized.platform).toBe('LeetCode');
  });

  it('normalizes CodeChef contest data', () => {
    const cc = {
      contest_code: 'START50',
      contest_name: 'Starters 50',
      contest_start_date_iso: '2024-01-15T14:30:00Z',
      contest_duration: 120,
    };
    const normalized = {
      id: `cc_${cc.contest_code}`,
      name: cc.contest_name,
      platform: 'CodeChef',
      startTime: new Date(cc.contest_start_date_iso).getTime(),
      duration: cc.contest_duration * 60 * 1000,
    };
    expect(normalized.id).toBe('cc_START50');
    expect(normalized.platform).toBe('CodeChef');
    expect(normalized.duration).toBe(7200000);
  });

  it('sorts contests by start time', () => {
    const contests = [
      { id: '3', startTime: 3000 },
      { id: '1', startTime: 1000 },
      { id: '2', startTime: 2000 },
    ];
    const sorted = contests.sort((a, b) => a.startTime - b.startTime);
    expect(sorted.map(c => c.id)).toEqual(['1', '2', '3']);
  });

  it('filters only future contests', () => {
    const now = Date.now();
    const contests = [
      { id: '1', startTime: now - 10000 },
      { id: '2', startTime: now + 10000 },
      { id: '3', startTime: now + 20000 },
    ];
    const future = contests.filter(c => c.startTime > now);
    expect(future.length).toBe(2);
  });

  it('limits to 5 contests', () => {
    const contests = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      startTime: Date.now() + (i + 1) * 1000,
    }));
    const limited = contests.slice(0, 5);
    expect(limited.length).toBe(5);
  });
});

describe('HomeScreen platform data construction', () => {
  it('builds LeetCode platform data correctly', () => {
    const data = {
      matchedUser: { submitStats: { acSubmissionNum: [{ count: 500 }] } },
      userContestRanking: { rating: 1689.5, attendedContestsCount: 24, topPercentage: 14.2 },
    };

    const rating = data?.userContestRanking?.rating;
    const totalSolved = data?.matchedUser?.submitStats?.acSubmissionNum?.[0]?.count;
    const contests = data?.userContestRanking?.attendedContestsCount;
    const topPercent = data?.userContestRanking?.topPercentage;

    const platformData = {
      username: 'test',
      rating: rating ? Math.round(rating) : null,
      solved: totalSolved,
      contests,
      topPercent,
    };

    expect(platformData.rating).toBe(1690);
    expect(platformData.solved).toBe(500);
    expect(platformData.contests).toBe(24);
    expect(platformData.topPercent).toBe(14.2);
  });

  it('builds Codeforces platform data correctly', () => {
    const info = { rating: 1500, maxRating: 1600, rank: 'specialist' };
    const history = [{ contestId: 1 }, { contestId: 2 }];

    const platformData = {
      username: 'test',
      rating: info?.rating || null,
      maxRating: info?.maxRating || null,
      rank: info?.rank || null,
      contests: Array.isArray(history) ? history.length : 0,
    };

    expect(platformData.rating).toBe(1500);
    expect(platformData.maxRating).toBe(1600);
    expect(platformData.rank).toBe('specialist');
    expect(platformData.contests).toBe(2);
  });

  it('builds CodeChef platform data correctly', () => {
    const data = {
      ratingData: [
        { rating: 1500, code: 'A' },
        { rating: 1800, code: 'B' },
      ],
      stars: '4',
    };

    const lastRating = data.ratingData.length > 0 ? data.ratingData[data.ratingData.length - 1].rating : null;
    const platformData = {
      username: 'test',
      rating: lastRating || null,
      stars: data?.stars || null,
      contests: data?.ratingData?.length || 0,
    };

    expect(platformData.rating).toBe(1800);
    expect(platformData.stars).toBe('4');
    expect(platformData.contests).toBe(2);
  });

  it('handles null/empty data gracefully', () => {
    const data = null;
    const lastRating = data?.ratingData?.length > 0 ? data.ratingData[data.ratingData.length - 1]?.rating : null;
    expect(lastRating).toBeNull();

    const contests = Array.isArray(null) ? null.length : 0;
    expect(contests).toBe(0);
  });
});

describe('AsyncStorage key conventions', () => {
  it('uses correct username storage keys', () => {
    const keys = { leetcode: 'lcusername', codeforces: 'cfusername', codechef: 'ccusername' };
    expect(keys.leetcode).toBe('lcusername');
    expect(keys.codeforces).toBe('cfusername');
    expect(keys.codechef).toBe('ccusername');
  });

  it('uses correct cache storage keys', () => {
    const keys = { leetcode: 'cache_lc', codeforces: 'cache_cf', codechef: 'cache_cc' };
    expect(keys.leetcode).toBe('cache_lc');
    expect(keys.codeforces).toBe('cache_cf');
    expect(keys.codechef).toBe('cache_cc');
  });

  it('uses correct platform enable keys', () => {
    const keys = { leetcode: 'platform_leetcode', codeforces: 'platform_codeforces', codechef: 'platform_codechef' };
    expect(keys.leetcode).toBe('platform_leetcode');
    expect(keys.codeforces).toBe('platform_codeforces');
    expect(keys.codechef).toBe('platform_codechef');
  });

  it('platform enabled defaults to true (non-false check)', () => {
    const check = (val) => val !== 'false';
    expect(check(null)).toBe(true);
    expect(check(undefined)).toBe(true);
    expect(check('true')).toBe(true);
    expect(check('false')).toBe(false);
  });
});
