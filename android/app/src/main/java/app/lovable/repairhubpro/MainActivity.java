package app.lovable.repairhubpro;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom plugins before calling super.onCreate
        registerPlugin(DeviceDiagnosticsPlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
