// server/test-gcs.js
console.log("🚀 STARTING MINIMAL GCS TEST v2 🚀");

// 1. 환경 변수 확인
const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credentials || credentials.length < 200) {
    console.error("❌ Minimal Test: GOOGLE_APPLICATION_CREDENTIALS is missing or too short.");
    process.exit(1); // 오류와 함께 프로세스 종료
}
console.log("✅ Minimal Test: Credentials variable seems OK.");

const { Storage } = require('@google-cloud/storage');

// 2. 실제 API 호출 (버킷 목록 가져오기)
async function runTest() {
    try {
        // 옵션 없이 Storage 클라이언트 초기화
        const storage = new Storage();
        console.log("✅ Minimal Test: 'new Storage()' was successful.");

        console.log("✅ Minimal Test: Attempting to list buckets...");
        const [buckets] = await storage.getBuckets();

        console.log("✅✅✅ SUCCESS! Minimal Test PASSED! Found buckets:");
        buckets.forEach(bucket => {
            console.log(` - ${bucket.name}`);
        });

        console.log("Test finished. Exiting.");
        process.exit(0); // 성공적으로 프로세스 종료

    } catch (e) {
        console.error("❌❌❌ FAILURE! Minimal Test FAILED during API call.", e);
        process.exit(1); // 오류와 함께 프로세스 종료
    }
}

runTest();
