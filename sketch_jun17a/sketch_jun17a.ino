#include <WiFi.h>
#include <FirebaseESP32.h>

#define WIFI_SSID "Personal-BD7-2.4GHz"
#define WIFI_PASSWORD "0144672830"
#define FIREBASE_HOST "amore-cff78-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "bBYlpVMyI8ZGwEbPidVjOzfj559HxtJu5pjoHZGJ"

#define TOUCH_A 15
#define TOUCH_B 4

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

bool estadoA = false;
bool estadoB = false;

void setup() {
  Serial.begin(9600);
  pinMode(TOUCH_A, INPUT);
  pinMode(TOUCH_B, INPUT);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi conectado!");

  config.host = FIREBASE_HOST;
  config.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&config, &auth);
}

void loop() {
  bool tA = digitalRead(TOUCH_A) == HIGH;
  bool tB = digitalRead(TOUCH_B) == HIGH;

  if (tA != estadoA) {
    estadoA = tA;
    Firebase.setBool(fbdo, "/sensores/A", tA);
  }
  if (tB != estadoB) {
    estadoB = tB;
    Firebase.setBool(fbdo, "/sensores/B", tB);
  }

  delay(100);
}