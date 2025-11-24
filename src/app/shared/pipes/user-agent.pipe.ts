import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'userAgent'
})

export class UserAgentPipe implements PipeTransform {
    transform(value: any, args?: any): any {
        let val = "";
        if (!!value) {
            let parsed = parseUserAgent(value);
            val = Object.keys(parsed).map((item) => `${(parsed as Record<string, string>)[item]}`).join(', ')
            val += '.'
        }


        return val;
    }
}

function parseUserAgent(uaString: string) {
    const result = {
        browser: 'Desconhecido',
        version: '',
        os: 'Desconhecido',
        engine: '',
        platform: '',
    };

    // Navegador e versão
    const chromeMatch = uaString.match(/Chrome\/([\d.]+)/);
    if (chromeMatch) {
        result.browser = 'Chrome';
        result.version = chromeMatch[1];
        result.engine = 'WebKit';
    }

    // Firefox
    const firefoxMatch = uaString.match(/Firefox\/([\d.]+)/);
    if (firefoxMatch) {
        result.browser = 'Firefox';
        result.version = firefoxMatch[1];
        result.engine = 'Gecko';
    }

    // Safari (não Chrome)
    if (uaString.includes('Safari') && !uaString.includes('Chrome')) {
        result.browser = 'Safari';
        const safariMatch = uaString.match(/Version\/([\d.]+)/);
        if (safariMatch) result.version = safariMatch[1];
        result.engine = 'WebKit';
    }

    // Sistema operacional
    if (uaString.includes('Mac OS X')) {
        const osMatch = uaString.match(/Mac OS X ([\d_]+)/);
        if (osMatch) {
            result.os = `macOS ${osMatch[1].replace(/_/g, '.')}`;
            result.platform = 'macOS';
        }
    } else if (uaString.includes('Windows NT')) {
        const osMatch = uaString.match(/Windows NT ([\d.]+)/);
        if (osMatch) {
            const version = osMatch[1];
            const versions = {
                '10.0': 'Windows 10',
                '6.3': 'Windows 8.1',
                '6.2': 'Windows 8',
                '6.1': 'Windows 7',
            };
            // @ts-ignore
            result.os = versions[version] || `Windows NT ${version}`;
            result.platform = 'Windows';
        }
    } else if (uaString.includes('Android')) {
        const osMatch = uaString.match(/Android ([\d.]+)/);
        if (osMatch) {
            result.os = `Android ${osMatch[1]}`;
            result.platform = 'Android';
        }
    } else if (uaString.includes('iPhone')) {
        result.os = 'iOS';
        result.platform = 'iPhone';
    } else if (uaString.includes('EstrelaDalvaApp')) {
        result.browser = 'Estrela Dalva App';
        result.engine = 'Dart';
        if (uaString.includes('iOS')) {
            result.os = 'iOS';
            result.platform = 'iOS';
        } else {
            result.os = 'Android';
            result.platform = 'Android';
        }
        if (uaString.split('/').length > 1) {
            const version = uaString.split('/')[1].split(' ')[0];
            result.version = version;
        }
    }
    console.log(result)

    return result;
}
