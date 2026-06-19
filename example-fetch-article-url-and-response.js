// example fetch - note the ed and sd query string parameters, which are date strings
await fetch("https://www.odbm.org/api/search/devotional?ed=2026-06-02&pg=1&sd=2026-06-01", {
    "credentials": "include",
    "headers": {
        "User-Agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:136.0) Gecko/20100101 Firefox/136.0",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-Hant",
        "Sec-GPC": "1",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-origin",
        "user-timezone": "America/Los_Angeles",
        "Priority": "u=4",
        "Pragma": "no-cache",
        "Cache-Control": "no-cache"
    },
    "referrer": "https://www.odbm.org/tc/devotionals",
    "method": "GET",
    "mode": "cors"
});

// example response
/*
{"filters":[{"label":"類型","facets":[{"label":"靈修","isSelected":false,"count":2}],"isAuthors":false,"isBibleBooks":false,"isBrands":false,"isContentTypes":true,"isLifeIssues":false,"isTopics":false},{"label":"作者","facets":[{"label":"潘艾梅","isSelected":false,"count":1},{"label":"許文榮","isSelected":false,"count":1}],"isAuthors":true,"isBibleBooks":false,"isBrands":false,"isContentTypes":false,"isLifeIssues":false,"isTopics":false}],"hasMorePages":false,"totalMatching":2,"totalPages":1,"items":[{"authorName":"許文榮","tags":["靈修"],"contentTag":"靈修","dateDisplay":"02 6月 2026","timeDisplay":null,"iconStyle":"Resource","image":{"imageType":"Image","imageAlt":"odb20260602.jpg","aspectRatio":null,"url":"/globalassets/global/images/odb20260602.jpg"},"title":"與上帝合作","description":"新加坡政府透過捐款配對計劃，鼓勵民眾支持公益。對於某些特定的慈善機構，政府會「加碼」捐出與民眾捐款相等或更高的金額。政府希望藉著讓捐款效益倍增，鼓勵民眾更積極參與慈...","url":"/tc/devotionals/devotional-category/%E8%88%87%E4%B8%8A%E5%B8%9D%E5%90%88%E4%BD%9C","videoUrl":null,"length":null},{"authorName":"潘艾梅","tags":["靈修"],"contentTag":"靈修","dateDisplay":"01 6月 2026","timeDisplay":null,"iconStyle":"Resource","image":{"imageType":"Image","imageAlt":"odb20260601.jpg","aspectRatio":null,"url":"/globalassets/global/images/odb20260601.jpg"},"title":"慷慨給予","description":"在1911到1915年間，章伯斯與妻子比迪在倫敦開辦聖經學院，他們始終秉持一個人生原則，那就是不拒絕任何有需要的人。他們這麼做，讓精明的倫敦人十分詫異，認為他們會被...","url":"/tc/devotionals/devotional-category/%E6%85%B7%E6%85%A8%E7%B5%A6%E4%BA%88-8088","videoUrl":null,"length":null}]}
*/

