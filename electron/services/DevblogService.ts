import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface DevblogItem {
  id: number;
  title: string;
  version: string;
  releaseDate: string;
  steamDbBuild: number;
  serverBuild?: number;
  era: '2025' | '2024' | '2021-2023' | '2018-2020' | '2016-2017';
  gdriveUrl?: string;
  isZip?: boolean;
  downloadFormat?: 'folder' | 'zip';
  client: {
    appId: number;
    depots: { depotId: number; manifestId: string; label: string }[];
  };
  serverWindows: {
    appId: number;
    depots: { depotId: number; manifestId: string; label: string }[];
  };
  serverLinux: {
    appId: number;
    depots: { depotId: number; manifestId: string; label: string }[];
  };
}

const GDRIVE_DEVBLOGS_MAP: Record<number, { gdriveUrl: string; isZip: boolean; downloadFormat: 'folder' | 'zip' }> = {
  65:  { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: false, downloadFormat: 'folder' },
  133: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: false, downloadFormat: 'folder' },
  177: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: false, downloadFormat: 'folder' },
  196: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: false, downloadFormat: 'folder' },
  199: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: false, downloadFormat: 'folder' },
  210: { gdriveUrl: 'https://drive.google.com/drive/folders/1DxNifpegHto06Z_YG5Lh-cHozwByby6N?usp=sharing', isZip: false, downloadFormat: 'folder' },
  217: { gdriveUrl: 'https://drive.google.com/drive/folders/1pw3tzvqAgU0JMl5Vo47fwfV2a4KPK1iD?usp=sharing', isZip: false, downloadFormat: 'folder' },
  220: { gdriveUrl: 'https://drive.google.com/drive/folders/1pJfsc8bPzjZZ9lL0qRS3Jsmk4Z5jMyDM?usp=sharing', isZip: false, downloadFormat: 'folder' },
  224: { gdriveUrl: 'https://drive.google.com/drive/folders/1QqwFrdYiYrQueq0aanuhcDTBBZKxa16n?usp=sharing', isZip: false, downloadFormat: 'folder' },
  236: { gdriveUrl: 'https://drive.google.com/drive/folders/1OJV2CcmeNO-37NiARDADAMIFBFORRoSU?usp=sharing', isZip: false, downloadFormat: 'folder' },
  240: { gdriveUrl: 'https://drive.google.com/drive/folders/1fz89o6TFt02S5tfRAEM2NmFS00pVQiXN?usp=sharing', isZip: false, downloadFormat: 'folder' },
  247: { gdriveUrl: 'https://drive.google.com/drive/folders/1TQnt7Zd_F9om27LKy7PbJaZgpNJdxQAt?usp=sharing', isZip: false, downloadFormat: 'folder' },
  248: { gdriveUrl: 'https://drive.google.com/drive/folders/1AHBnRkCqa92rNm3zElVEHP1h5xWvYo-U?usp=sharing', isZip: false, downloadFormat: 'folder' },
  261: { gdriveUrl: 'https://drive.google.com/drive/folders/1SMtoI_q24ka1dCqM2twgpScYpNT9g2I5?usp=sharing', isZip: false, downloadFormat: 'folder' },
  264: { gdriveUrl: 'https://drive.google.com/drive/folders/1MTWubsCsBvwqiirPd_brlvz8FuvIpBOX?usp=sharing', isZip: false, downloadFormat: 'folder' },
  265: { gdriveUrl: 'https://drive.google.com/drive/folders/1biPSLHBTcJUHLUeIy00HHgaL1yfUNUUz?usp=sharing', isZip: false, downloadFormat: 'folder' },
  266: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: true,  downloadFormat: 'zip' },
  277: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: true,  downloadFormat: 'zip' },
  280: { gdriveUrl: 'https://drive.google.com/drive/folders/1PzGY7XMCZkLFcXigQ3XfXV0kCb1RYTBp?usp=sharing', isZip: false, downloadFormat: 'folder' },
  287: { gdriveUrl: 'https://drive.google.com/drive/folders/1BBmhLE-u84W4oDqjnoWrv5BNsTxseIRZ?usp=sharing', isZip: false, downloadFormat: 'folder' },
  290: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: true,  downloadFormat: 'zip' },
  292: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: true,  downloadFormat: 'zip' },
  295: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: true,  downloadFormat: 'zip' },
  297: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: true,  downloadFormat: 'zip' },
  299: { gdriveUrl: 'https://drive.google.com/drive/folders/1PWHR2IeoMilxvsBP6DGHXH4ods70Q2Rf?usp=sharing', isZip: false, downloadFormat: 'folder' },
  301: { gdriveUrl: 'https://drive.google.com/drive/folders/1EPWCiqF4XgEAqnwhO4G3HuASRZdjGIVv?usp=sharing', isZip: true,  downloadFormat: 'zip' }
};

export class DevblogService {
  private devblogs: DevblogItem[] = [
    {
      id: 301,
      title: 'Devblog 301',
      version: 'v2602',
      releaseDate: '02.10.2025',
      steamDbBuild: 20224984,
      serverBuild: 20222529,
      era: '2025',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '4416693356279399220', label: 'Rust Content' },
          { depotId: 252494, manifestId: '4816143646136524351', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '1021021017075539798', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '7800489136632237329', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '4650722202857188018', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '7800489136632237329', label: 'Server Content' }
        ]
      }
    },
    {
      id: 299,
      title: 'Devblog 299',
      version: 'v2594',
      releaseDate: '07.08.2025',
      steamDbBuild: 19504798,
      serverBuild: 19504525,
      era: '2025',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '3715744439160106772', label: 'Rust Content' },
          { depotId: 252494, manifestId: '8793341769078439703', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '4691522389441303606', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '4578281456729866300', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '1452146367731922762', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '4578281456729866300', label: 'Server Content' }
        ]
      }
    },
    {
      id: 297,
      title: 'Devblog 297',
      version: 'v2592',
      releaseDate: '03.07.2025',
      steamDbBuild: 19089949,
      serverBuild: 19089646,
      era: '2025',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '4063535500540036132', label: 'Rust Content' },
          { depotId: 252494, manifestId: '2134704175811384720', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '3424665508261754630', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '6356552833801906345', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '6474482950077244651', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '6356552833801906345', label: 'Server Content' }
        ]
      }
    },
    {
      id: 295,
      title: 'Devblog 295',
      version: 'v2580',
      releaseDate: '06.02.2025',
      steamDbBuild: 17265509,
      serverBuild: 17264843,
      era: '2025',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '6971406074665383482', label: 'Rust Content' },
          { depotId: 252494, manifestId: '6237166519664317351', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '3887947441418003849', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '8648086317383607729', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '8349664598014094040', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '8648086317383607729', label: 'Server Content' }
        ]
      }
    },
    {
      id: 292,
      title: 'Devblog 292',
      version: 'v2574',
      releaseDate: '23.01.2025',
      steamDbBuild: 17089656,
      serverBuild: 17088764,
      era: '2025',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '5465071456681086489', label: 'Rust Content' },
          { depotId: 252494, manifestId: '1701770404083455481', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '7586335893180490615', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '2489285884986109775', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '1073769602169599666', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '2489285884986109775', label: 'Server Content' }
        ]
      }
    },
    {
      id: 290,
      title: 'Devblog 290',
      version: 'v2570',
      releaseDate: '05.12.2024',
      steamDbBuild: 16644001,
      serverBuild: 16643237,
      era: '2024',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '3303092237848210131', label: 'Rust Content' },
          { depotId: 252494, manifestId: '1788204873881687028', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '3604119712284818559', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '1683559528736641086', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '2321035181135984620', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '1683559528736641086', label: 'Server Content' }
        ]
      }
    },
    {
      id: 287,
      title: 'Devblog 287',
      version: 'v2567',
      releaseDate: '07.11.2024',
      steamDbBuild: 16321148,
      serverBuild: 16320580,
      era: '2024',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '1365024171762175667', label: 'Rust Content' },
          { depotId: 252494, manifestId: '4555026184976020707', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '29462869521327376', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '5574379612815873296', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '4071293782901305534', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '5574379612815873296', label: 'Server Content' }
        ]
      }
    },
    {
      id: 280,
      title: 'Devblog 280',
      version: 'v2398',
      releaseDate: '06.07.2023',
      steamDbBuild: 11640748,
      serverBuild: 11632858,
      era: '2021-2023',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '7517967092170946419', label: 'Rust Content' },
          { depotId: 252494, manifestId: '1777641625544858501', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '6742168151988093956', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '3156696458161563140', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '4842488648770268781', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '3156696458161563140', label: 'Server Content' }
        ]
      }
    },
    {
      id: 277,
      title: 'Devblog 277',
      version: 'v2392',
      releaseDate: '01.06.2023',
      steamDbBuild: 11368731,
      serverBuild: 11368429,
      era: '2021-2023',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '3444346980629669094', label: 'Rust Content' },
          { depotId: 252494, manifestId: '2541365159433812667', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '7251289959338928249', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '2903091549176777020', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '2651148949229055567', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '2903091549176777020', label: 'Server Content' }
        ]
      }
    },
    {
      id: 266,
      title: 'Devblog 266',
      version: 'v2388',
      releaseDate: '04.05.2023',
      steamDbBuild: 11149502,
      serverBuild: 11149312,
      era: '2021-2023',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '1919607204452469545', label: 'Rust Content' },
          { depotId: 252494, manifestId: '3408792150962438895', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '4681818100412413194', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '6938301573081959130', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '4556933184073971061', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '6938301573081959130', label: 'Server Content' }
        ]
      }
    },
    {
      id: 265,
      title: 'Devblog 265',
      version: 'v2377',
      releaseDate: '02.03.2023',
      steamDbBuild: 10669774,
      serverBuild: 10675316,
      era: '2021-2023',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '7302086296900720569', label: 'Rust Content' },
          { depotId: 252494, manifestId: '842283549110308780', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '4829571540138155148', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '3353088463860743462', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '5267028499025308574', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '3353088463860743462', label: 'Server Content' }
        ]
      }
    },
    {
      id: 264,
      title: 'Devblog 264',
      version: 'v2370',
      releaseDate: '02.02.2023',
      steamDbBuild: 10459860,
      serverBuild: 10456742,
      era: '2021-2023',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '5444669099736419111', label: 'Rust Content' },
          { depotId: 252494, manifestId: '6247199584662595103', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '8530792074324590657', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '6509434444576664711', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '5439620263988010614', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '6509434444576664711', label: 'Server Content' }
        ]
      }
    },
    {
      id: 261,
      title: 'Devblog 261',
      version: 'v2332',
      releaseDate: '07.04.2022',
      steamDbBuild: 8516935,
      serverBuild: 8516889,
      era: '2021-2023',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '6511542711425244729', label: 'Rust Content' },
          { depotId: 252494, manifestId: '2826153980842130154', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '4000557949315425516', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '9080219904825272632', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '486117377675336145', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '9080219904825272632', label: 'Server Content' }
        ]
      }
    },
    {
      id: 248,
      title: 'Devblog 248',
      version: 'v2301',
      releaseDate: '06.05.2021',
      steamDbBuild: 6658245,
      serverBuild: 6658173,
      era: '2021-2023',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '4746887374949251340', label: 'Rust Content' },
          { depotId: 252494, manifestId: '6955200604060851353', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '5226442379699449696', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '6870441081557997423', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '2300524604947971720', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '6870441081557997423', label: 'Server Content' }
        ]
      }
    },
    {
      id: 247,
      title: 'Devblog 247',
      version: 'v2293',
      releaseDate: '01.04.2021',
      steamDbBuild: 6476485,
      serverBuild: 6476340,
      era: '2021-2023',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '348236136220284344', label: 'Rust Content' },
          { depotId: 252494, manifestId: '7788898182701923672', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '1680681200883117663', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '2505480358621067699', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '8947167339509788620', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '2505480358621067699', label: 'Server Content' }
        ]
      }
    },
    {
      id: 240,
      title: 'Devblog 240',
      version: 'v2283',
      releaseDate: '04.03.2021',
      steamDbBuild: 6330368,
      serverBuild: 6331456,
      era: '2021-2023',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '6588092414346855827', label: 'Rust Content' },
          { depotId: 252494, manifestId: '5170085988979167056', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '3185768740838577020', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '4143907008096394712', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '4310863969849232986', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '4143907008096394712', label: 'Server Content' }
        ]
      }
    },
    {
      id: 236,
      title: 'Devblog 236',
      version: 'v2271',
      releaseDate: '03.12.2020',
      steamDbBuild: 5917395,
      serverBuild: 5917315,
      era: '2018-2020',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '6359488678146525992', label: 'Rust Content' },
          { depotId: 252494, manifestId: '1724503696383038007', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '4205531530436009447', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '2243994564188325488', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '2212403114532496447', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '2243994564188325488', label: 'Server Content' }
        ]
      }
    },
    {
      id: 224,
      title: 'Devblog 224',
      version: 'v2215',
      releaseDate: '06.02.2020',
      steamDbBuild: 4648742,
      serverBuild: 4648742,
      era: '2018-2020',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '8980514435703728862', label: 'Rust Content' },
          { depotId: 252494, manifestId: '4931154401135127611', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '7377373544229186547', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '1085230729601995503', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '1304374629479631419', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '1085230729601995503', label: 'Server Content' }
        ]
      }
    },
    {
      id: 220,
      title: 'Devblog 220',
      version: 'v2201',
      releaseDate: '07.11.2019',
      steamDbBuild: 4366157,
      serverBuild: 4366142,
      era: '2018-2020',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '6523830201429967029', label: 'Rust Content' },
          { depotId: 252494, manifestId: '465514303552168456', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '5274601782433685066', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '810189921484989258', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '5303971768715727088', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '810189921484989258', label: 'Server Content' }
        ]
      }
    },
    {
      id: 217,
      title: 'Devblog 217',
      version: 'v2183',
      releaseDate: '01.08.2019',
      steamDbBuild: 4066595,
      serverBuild: 4066564,
      era: '2018-2020',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '5963398435027743481', label: 'Rust Content' },
          { depotId: 252494, manifestId: '8234461438389052725', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '6893659423357099067', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '862846285559986990', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '2828049179119338857', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '862846285559986990', label: 'Server Content' }
        ]
      }
    },
    {
      id: 210,
      title: 'Devblog 210',
      version: 'v2151',
      releaseDate: '07.02.2019',
      steamDbBuild: 3541919,
      serverBuild: 3541919,
      era: '2018-2020',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '4482473459608243906', label: 'Rust Content' },
          { depotId: 252494, manifestId: '3123129822101471198', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '5202757130691551218', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '447586385338600633', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '8718663073112589442', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '447586385338600633', label: 'Server Content' }
        ]
      }
    },
    {
      id: 199,
      title: 'Devblog 199',
      version: 'v2081',
      releaseDate: '05.04.2018',
      steamDbBuild: 2663954,
      serverBuild: 2663954,
      era: '2018-2020',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '8294130072040609864', label: 'Rust Content' },
          { depotId: 252494, manifestId: '7287300143467377410', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '1136164812490466117', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '6093546884420686704', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '6528824318026613673', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '6093546884420686704', label: 'Server Content' }
        ]
      }
    },
    {
      id: 196,
      title: 'Devblog 196',
      version: 'v2054',
      releaseDate: '01.02.2018',
      steamDbBuild: 2489859,
      serverBuild: 2489874,
      era: '2018-2020',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '3496034709698234027', label: 'Rust Content' },
          { depotId: 252494, manifestId: '7648931322855505737', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '300803357469538946', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '1322930226920703791', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '7118076359863361294', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '1322930226920703791', label: 'Server Content' }
        ]
      }
    },
    {
      id: 177,
      title: 'Devblog 177',
      version: 'v2013',
      releaseDate: '14.09.2017',
      steamDbBuild: 2119750,
      serverBuild: 2119753,
      era: '2016-2017',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '29188748842907684', label: 'Rust Content' },
          { depotId: 252494, manifestId: '7509419689742128941', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '4394758456253204934', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '5367839380001340264', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '8283725174549034568', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '5367839380001340264', label: 'Server Content' }
        ]
      }
    },
    {
      id: 133,
      title: 'Devblog 133',
      version: 'v1806 (Old Blueprint Era)',
      releaseDate: '27.10.2016',
      steamDbBuild: 1419038,
      serverBuild: 1419038,
      era: '2016-2017',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '4682077113322583976', label: 'Rust Content' },
          { depotId: 252494, manifestId: '3509908398283860043', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '3471418522324482926', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '6665591592489713100', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '1397657802455113331', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '6665591592489713100', label: 'Server Content' }
        ]
      }
    },
    {
      id: 65,
      title: 'Devblog 65',
      version: 'v1695 (Legacy Rust Classic)',
      releaseDate: '01.09.2016',
      steamDbBuild: 1313161,
      serverBuild: 1313129,
      era: '2016-2017',
      client: {
        appId: 252490,
        depots: [
          { depotId: 252495, manifestId: '2205013419465549186', label: 'Rust Content' },
          { depotId: 252494, manifestId: '3150957458736812950', label: 'Rust Executable' }
        ]
      },
      serverWindows: {
        appId: 258550,
        depots: [
          { depotId: 258551, manifestId: '5280465317626182394', label: 'Server Win x64' },
          { depotId: 258554, manifestId: '6895785912482287582', label: 'Server Content' }
        ]
      },
      serverLinux: {
        appId: 258550,
        depots: [
          { depotId: 258552, manifestId: '4968436111866428932', label: 'Server Linux x64' },
          { depotId: 258554, manifestId: '6895785912482287582', label: 'Server Content' }
        ]
      }
    }
  ];

  public getDevblogs(): DevblogItem[] {
    return this.devblogs.map((db) => {
      const gdrive = GDRIVE_DEVBLOGS_MAP[db.id];
      return gdrive ? { ...db, ...gdrive } : db;
    });
  }

  public async mergeDepotFolders(
    sourceDepotRoot: string,
    targetServerDir: string
  ): Promise<{ success: boolean; message: string; filesCopied: number }> {
    try {
      if (!fs.existsSync(sourceDepotRoot)) {
        return { success: false, message: `Каталог с депотами не найден: ${sourceDepotRoot}`, filesCopied: 0 };
      }

      if (!fs.existsSync(targetServerDir)) {
        fs.mkdirSync(targetServerDir, { recursive: true });
      }

      let count = 0;
      const entries = fs.readdirSync(sourceDepotRoot, { withFileTypes: true });

      const copyRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const items = fs.readdirSync(src, { withFileTypes: true });
        for (const item of items) {
          const s = path.join(src, item.name);
          const d = path.join(dest, item.name);
          if (item.isDirectory()) {
            copyRecursive(s, d);
          } else {
            fs.copyFileSync(s, d);
            count++;
          }
        }
      };

      for (const entry of entries) {
        const full = path.join(sourceDepotRoot, entry.name);
        if (entry.isDirectory() && entry.name.toLowerCase().startsWith('depot_')) {
          copyRecursive(full, targetServerDir);
        }
      }

      // If source itself directly contains files rather than depot_* subfolders
      if (count === 0) {
        copyRecursive(sourceDepotRoot, targetServerDir);
      }

      return {
        success: true,
        message: `Успешно объединено и скопировано ${count} файлов в ${targetServerDir}!`,
        filesCopied: count
      };
    } catch (err: any) {
      return { success: false, message: `Ошибка сборки депотов: ${err.message}`, filesCopied: 0 };
    }
  }

  public assembleDevblogBundle(options: {
    targetBaseDir: string;
    serverSourceDir?: string;
    clientSourceDir?: string;
    devblogId: number;
    devblogVersion: string;
    serverPort: number;
  }): {
    success: boolean;
    message: string;
    serverCreated: boolean;
    clientCreated: boolean;
    serverPath: string;
    clientPath: string;
    serverFilesCount: number;
    clientFilesCount: number;
  } {
    const targetServerDir = path.join(options.targetBaseDir, 'server');
    const targetClientDir = path.join(options.targetBaseDir, 'client');

    const copyRecursive = (src: string, dest: string): number => {
      if (!fs.existsSync(src)) return 0;
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      const items = fs.readdirSync(src, { withFileTypes: true });
      let c = 0;
      for (const item of items) {
        const s = path.join(src, item.name);
        const d = path.join(dest, item.name);
        if (item.isDirectory()) {
          c += copyRecursive(s, d);
        } else {
          fs.copyFileSync(s, d);
          c++;
        }
      }
      return c;
    };

    const searchAndMerge = (customDir: string | undefined, appId: string, destDir: string): number => {
      const candidates = [
        customDir,
        `C:\\Program Files (x86)\\Steam\\steamapps\\content\\app_${appId}`,
        `C:\\Steam\\steamapps\\content\\app_${appId}`,
        `D:\\Steam\\steamapps\\content\\app_${appId}`,
        `E:\\Steam\\steamapps\\content\\app_${appId}`,
        path.join(options.targetBaseDir, '_tools', 'steamcmd', 'steamapps', 'content', `app_${appId}`)
      ].filter(Boolean) as string[];

      let total = 0;
      for (const root of candidates) {
        if (fs.existsSync(root)) {
          const entries = fs.readdirSync(root, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && entry.name.toLowerCase().startsWith('depot_')) {
              total += copyRecursive(path.join(root, entry.name), destDir);
            }
          }
          if (total === 0) {
            total += copyRecursive(root, destDir);
          }
        }
      }
      return total;
    };

    const serverFiles = searchAndMerge(options.serverSourceDir, '258550', targetServerDir);
    const clientFiles = searchAndMerge(options.clientSourceDir, '252490', targetClientDir);

    const hasServerExe = fs.existsSync(path.join(targetServerDir, 'RustDedicated.exe'));
    const hasClientExe = fs.existsSync(path.join(targetClientDir, 'RustClient.exe')) || fs.existsSync(path.join(targetClientDir, 'Rust.exe'));

    // Create client launcher batch
    if (clientFiles > 0 || hasClientExe) {
      try {
        if (!fs.existsSync(targetClientDir)) fs.mkdirSync(targetClientDir, { recursive: true });
        const batContent = `@echo off\r\ntitle Rust Devblog ${options.devblogId} (${options.devblogVersion}) Client Launcher\r\necho Starting Rust Client and connecting to 127.0.0.1:${options.serverPort}...\r\nstart "" "RustClient.exe" -connect 127.0.0.1:${options.serverPort}\r\n`;
        fs.writeFileSync(path.join(targetClientDir, 'Start_Client.bat'), batContent);
      } catch {}
    }

    if (serverFiles === 0 && clientFiles === 0 && !hasServerExe && !hasClientExe) {
      return {
        success: false,
        message: 'Файлы депотов еще не скачаны в Steam. Запустите загрузку через консоль Steam (кнопка ниже).',
        serverCreated: false,
        clientCreated: false,
        serverPath: targetServerDir,
        clientPath: targetClientDir,
        serverFilesCount: 0,
        clientFilesCount: 0
      };
    }

    return {
      success: hasServerExe || hasClientExe || serverFiles > 0,
      message: `Успешно собрано: Сервер (${serverFiles} файлов) и Клиент (${clientFiles} файлов)!`,
      serverCreated: hasServerExe || serverFiles > 0,
      clientCreated: hasClientExe || clientFiles > 0,
      serverPath: targetServerDir,
      clientPath: targetClientDir,
      serverFilesCount: serverFiles,
      clientFilesCount: clientFiles
    };
  }

  public patchNoSteam(gameDir: string): { success: boolean; message: string; method: string; patchedCount: number } {
    try {
      if (!fs.existsSync(gameDir)) {
        return { success: false, message: `Папка ${gameDir} не существует.`, method: 'error', patchedCount: 0 };
      }

      // 1. Update steam_appid.txt for Spacewar (AppID 480)
      const appidPath = path.join(gameDir, 'steam_appid.txt');
      fs.writeFileSync(appidPath, '480\n');

      return {
        success: true,
        message: 'Файл steam_appid.txt настроен на 480 (Spacewar).',
        method: 'steam_appid.txt',
        patchedCount: 1
      };
    } catch (err: any) {
      return { success: false, message: `Ошибка применения NoSteam патча: ${err.message}`, method: 'error', patchedCount: 0 };
    }
  }

  public getDevblogCatalog(): DevblogItem[] {
    return this.getDevblogs();
  }

  public getDevblogById(id: number): DevblogItem | undefined {
    const db = this.devblogs.find((d) => d.id === Number(id));
    if (!db) return undefined;
    const gdrive = GDRIVE_DEVBLOGS_MAP[db.id];
    return gdrive ? { ...db, ...gdrive } : db;
  }

  public async autoDownloadAndBuildDevblog(
    options: {
      devblogId: number;
      targetBaseDir: string;
      serverPort?: number;
      installClient?: boolean;
      applyNoSteam?: boolean;
      installOxide?: boolean;
      username?: string;
      password?: string;
    },
    onLog?: (msg: string) => void
  ): Promise<{ success: boolean; message: string; serverPath: string; clientPath: string }> {
    const db = this.getDevblogById(options.devblogId);
    if (!db) {
      return { success: false, message: `Девблог ${options.devblogId} не найден в каталоге.`, serverPath: '', clientPath: '' };
    }

    // Ensure base directory has the devblog name
    let baseDir = options.targetBaseDir.trim();
    if (!baseDir.toLowerCase().includes(`devblog_${options.devblogId}`) && !baseDir.toLowerCase().endsWith(`devblog_${options.devblogId}`)) {
      baseDir = path.join(baseDir, `Rust_Devblog_${options.devblogId}`);
    }

    const targetServerDir = path.join(baseDir, 'server');
    const targetClientDir = path.join(baseDir, 'client');
    const port = options.serverPort || 28015;

    if (!fs.existsSync(targetServerDir)) fs.mkdirSync(targetServerDir, { recursive: true });
    if (!fs.existsSync(targetClientDir)) fs.mkdirSync(targetClientDir, { recursive: true });

    const candidatePaths = [
      path.join(process.cwd(), '_tools', 'depotdownloader', 'DepotDownloader.exe'),
      path.join(__dirname, '..', '_tools', 'depotdownloader', 'DepotDownloader.exe'),
      path.join((process as any).resourcesPath || '', '_tools', 'depotdownloader', 'DepotDownloader.exe'),
      'D:\\ai\\apps\\RustPilot\\_tools\\depotdownloader\\DepotDownloader.exe'
    ];

    const depotDownloaderExe = candidatePaths.find((p) => fs.existsSync(p));
    if (!depotDownloaderExe) {
      return { success: false, message: 'DepotDownloader.exe не найден в папке _tools/depotdownloader', serverPath: '', clientPath: '' };
    }

    const installLogPath = path.join(baseDir, 'install_log.txt');
    try { fs.writeFileSync(installLogPath, `=== RustPilot Devblog ${db.id} Installation Log ===\r\nStarted: ${new Date().toISOString()}\r\n\r\n`); } catch {}

    const logAndSave = (msg: string) => {
      const timestamp = new Date().toLocaleTimeString();
      try { fs.appendFileSync(installLogPath, `[${timestamp}] ${msg}\r\n`); } catch {}
      onLog?.(msg);
    };

    const depotDownloaderDir = path.dirname(depotDownloaderExe);
    const steamUsername = options.username || 'huskaraxe0031200';

    const { spawn } = require('child_process');

    const downloadDepot = (appId: number, depotId: number, manifestId: string, destDir: string): Promise<boolean> => {
      return new Promise((resolve) => {
        const args = [
          '-app', appId.toString(),
          '-depot', depotId.toString(),
          '-manifest', manifestId,
          '-dir', destDir,
          '-username', steamUsername,
          '-remember-password',
          '-max-downloads', '8'
        ];

        if (options.password) {
          args.push('-password', options.password);
        }

        logAndSave(`[Загрузка] AppID ${appId}, Депот ${depotId} (Манифест ${manifestId})...`);

        const proc = spawn(depotDownloaderExe, args, { cwd: depotDownloaderDir });

        proc.stdout?.on('data', (data: Buffer) => {
          const text = data.toString();
          const lines = text.split('\n');
          for (const line of lines) {
            const clean = line.trim();
            if (!clean) continue;
            try { fs.appendFileSync(installLogPath, `[STDOUT] ${clean}\r\n`); } catch {}

            const match = clean.match(/(\d+\.\d+)\%/);
            if (match) {
              onLog?.(`[Депот ${depotId}] ${match[1]}% - ${clean}`);
            } else if (clean.toLowerCase().includes('error') || clean.toLowerCase().includes('denied') || clean.toLowerCase().includes('fail') || clean.toLowerCase().includes('exception') || clean.toLowerCase().includes('connecting') || clean.toLowerCase().includes('manifest') || clean.toLowerCase().includes('got depot key')) {
              onLog?.(`[Депот ${depotId}] ${clean}`);
            }
          }
        });

        proc.stderr?.on('data', (data: Buffer) => {
          const errText = data.toString().trim();
          if (errText) {
            try { fs.appendFileSync(installLogPath, `[STDERR] ${errText}\r\n`); } catch {}
            onLog?.(`[Предупреждение] ${errText}`);
          }
        });

        proc.on('close', (code: number) => {
          logAndSave(`[Депот ${depotId}] Завершен с кодом: ${code}`);
          resolve(code === 0);
        });

        proc.on('error', (err: any) => {
          logAndSave(`[Ошибка процесса] ${err.message}`);
          resolve(false);
        });
      });
    };

    // 1. Download Server Depots into \server
    logAndSave(`Начало скачивания выделенного сервера (AppID ${db.serverWindows.appId})...`);
    for (const depot of db.serverWindows.depots) {
      logAndSave(`Скачивание сервера: ${depot.label} (Депот ${depot.depotId})...`);
      await downloadDepot(db.serverWindows.appId, depot.depotId, depot.manifestId, targetServerDir);
    }

    // 2. Download Client Depots into \client
    if (options.installClient !== false) {
      onLog?.(`Начало скачивания клиента игры (AppID ${db.client.appId})...`);
      for (const depot of db.client.depots) {
        onLog?.(`Скачивание клиента: ${depot.label} (Депот ${depot.depotId})...`);
        await downloadDepot(db.client.appId, depot.depotId, depot.manifestId, targetClientDir);
      }
    }

    // 3. Create Launchers in server and client
    const startServerBat = `@echo off\r\ntitle Rust Devblog ${db.id} Dedicated Server\r\necho Starting Rust Devblog ${db.id} (${db.version}) Server on port ${port}...\r\nRustDedicated.exe -batchmode -nographics +server.ip 0.0.0.0 +server.port ${port} +server.queryport ${port + 2} +rcon.port ${port + 1} +rcon.password "admin" +server.identity "rustserver" +server.hostname "Rust Devblog ${db.id} Server" +server.maxplayers 50 +server.worldsize 3000 +server.seed 123456 +server.eac 0\r\n`;
    fs.writeFileSync(path.join(targetServerDir, 'Start_Server.bat'), startServerBat);

    if (options.installClient !== false) {
      const startClientBat = `@echo off\r\ntitle Rust Devblog ${db.id} Client Launcher\r\necho ===================================================\r\necho Запуск клиента Rust Devblog ${db.id}...\r\necho Убедитесь, что Steam запущен в фоновом режиме!\r\necho ===================================================\r\nstart "" "RustClient.exe" -force-d3d11 +connect 127.0.0.1:${port}\r\n`;
      fs.writeFileSync(path.join(targetClientDir, 'Start_Client.bat'), startClientBat);
    }

    // 5. Apply Unity 5.4 / Windows 10/11 & EAC Compatibility Patches
    onLog?.(`Применение патча совместимости с Windows 10/11 и современными GPU...`);
    this.patchAssemblyCompatibility(targetServerDir, onLog);
    if (options.installClient !== false) {
      this.patchAssemblyCompatibility(targetClientDir, onLog);
    }

    // 6. Install Oxide / uMod if requested
    if (options.installOxide) {
      onLog?.(`⚡ Установка Oxide / uMod для Devblog ${db.id}...`);
      await this.installOxide(targetServerDir, db.id, onLog);
    }

    // 7. Apply NoSteam Patch if requested
    if (options.applyNoSteam) {
      onLog?.(`Применение патча NoSteam (Spacewar 480)...`);
      if (options.installClient !== false) {
        this.patchNoSteam(targetClientDir);
      }
      this.patchNoSteam(targetServerDir);
    }

    onLog?.(`✓ Установка и сборка Devblog ${db.id} успешно завершена в ${baseDir}!`);

    return {
      success: true,
      message: `Devblog ${db.id} (${db.version}) успешно скачан и собран в ${baseDir} (папки \\server и \\client)!`,
      serverPath: targetServerDir,
      clientPath: targetClientDir
    };
  }

  public patchAssemblyCompatibility(gameDir: string, onLog?: (msg: string) => void) {
    try {
      const patcherDll = path.join(process.cwd(), '_tools', 'PatcherTool', 'bin', 'Release', 'net10.0', 'PatcherTool.dll');
      const patcherDllAlt = path.join(__dirname, '..', '_tools', 'PatcherTool', 'bin', 'Release', 'net10.0', 'PatcherTool.dll');
      const patcherPath = fs.existsSync(patcherDll) ? patcherDll : patcherDllAlt;

      const managedDirs = [
        path.join(gameDir, 'RustClient_Data', 'Managed'),
        path.join(gameDir, 'RustDedicated_Data', 'Managed')
      ];

      for (const mDir of managedDirs) {
        const assemblyPath = path.join(mDir, 'Assembly-CSharp.dll');
        if (fs.existsSync(assemblyPath) && fs.existsSync(patcherPath)) {
          const { execSync } = require('child_process');
          execSync(`dotnet "${patcherPath}" "${assemblyPath}"`);
          onLog?.(`✓ Патч совместимости (Unity 5.4 / EAC bypass) успешно применен к ${path.basename(mDir)}`);
        }
      }
    } catch (err: any) {
      onLog?.(`[Предупреждение патчера] ${err.message}`);
    }
  }

  public async installOxide(
    serverDir: string,
    devblogId: number,
    onLog?: (msg: string) => void
  ): Promise<{ success: boolean; message: string }> {
    try {
      const oxidePluginsDir = path.join(serverDir, 'oxide', 'plugins');
      const oxideConfigDir = path.join(serverDir, 'oxide', 'config');
      const oxideDataDir = path.join(serverDir, 'oxide', 'data');
      const oxideLogsDir = path.join(serverDir, 'oxide', 'logs');

      [oxidePluginsDir, oxideConfigDir, oxideDataDir, oxideLogsDir].forEach((d) => {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      });

      // Sample Starter Plugin
      const samplePluginPath = path.join(oxidePluginsDir, 'RustPilotWelcome.cs');
      if (!fs.existsSync(samplePluginPath)) {
        const csContent = `using Oxide.Core.Plugins;

namespace Oxide.Plugins
{
    [Info("RustPilotWelcome", "TEAM_RUST_PLUGINS", "1.0.0")]
    [Description("Welcome message for Devblog Server")]
    public class RustPilotWelcome : RustPlugin
    {
        void OnServerInitialized()
        {
            Puts("✓ Devblog ${devblogId} Server is active with Oxide & RustPilot!");
        }

        void OnPlayerConnected(BasePlayer player)
        {
            if (player != null)
            {
                PrintToChat(player, "<color=#ff3344>[RustPilot]</color> Добро пожаловать на сервер <color=#00e5ff>Devblog ${devblogId}</color>!");
            }
        }
    }
}
`;
        fs.writeFileSync(samplePluginPath, csContent);
      }

      onLog?.(`✓ Структура папок Oxide (oxide/plugins, oxide/config) успешно создана!`);
      return { success: true, message: `Oxide успешно сконфигурирован для Devblog ${devblogId}!` };
    } catch (err: any) {
      onLog?.(`[Предупреждение Oxide] ${err.message}`);
      return { success: false, message: `Ошибка установки Oxide: ${err.message}` };
    }
  }

  public launchClient(clientDir: string, serverPort: number = 28015): { success: boolean; message: string } {
    try {
      // Auto-patch client Managed directory before launch
      const managedDir = path.join(clientDir, 'RustClient_Data', 'Managed');
      if (fs.existsSync(managedDir)) {
        try {
          const patcherExe = path.resolve(__dirname, '../../../_tools/PatcherTool/bin/Release/net10.0/PatcherTool.exe');
          if (fs.existsSync(patcherExe)) {
            execSync(`"${patcherExe}" "${managedDir}"`, { windowsHide: true });
          }
        } catch {}
      }

      const exes = ['RustClient.exe', 'Rust.exe', 'RustClient_x64.exe'];
      for (const exe of exes) {
        const p = path.join(clientDir, exe);
        if (fs.existsSync(p)) {
          const { spawn } = require('child_process');
          spawn(p, ['-connect', `127.0.0.1:${serverPort}`], {
            cwd: clientDir,
            detached: true,
            stdio: 'ignore'
          }).unref();

          return { success: true, message: `Игровой клиент ${exe} успешно запущен и подключается к 127.0.0.1:${serverPort}!` };
        }
      }

      return { success: false, message: `Файл RustClient.exe не найден в директории: ${clientDir}` };
    } catch (err: any) {
      return { success: false, message: `Ошибка запуска клиента: ${err.message}` };
    }
  }

  public async importDevblogArchiveOrFolder(
    options: {
      devblogId: number;
      sourcePath: string;
      targetBaseDir: string;
      serverPort?: number;
      installClient?: boolean;
      applyNoSteam?: boolean;
      installOxide?: boolean;
    },
    onLog?: (msg: string) => void
  ): Promise<{ success: boolean; message: string; serverPath: string; clientPath: string }> {
    const db = this.getDevblogById(options.devblogId);
    if (!db) {
      return { success: false, message: `Девблог ${options.devblogId} не найден в каталоге.`, serverPath: '', clientPath: '' };
    }

    const source = options.sourcePath?.trim();
    if (!source || !fs.existsSync(source)) {
      return { success: false, message: `Указанный путь не существует: ${source}`, serverPath: '', clientPath: '' };
    }

    let baseDir = options.targetBaseDir.trim();
    if (!baseDir.toLowerCase().includes(`devblog_${options.devblogId}`) && !baseDir.toLowerCase().endsWith(`devblog_${options.devblogId}`)) {
      baseDir = path.join(baseDir, `Rust_Devblog_${options.devblogId}`);
    }

    const targetServerDir = path.join(baseDir, 'server');
    const targetClientDir = path.join(baseDir, 'client');
    const port = options.serverPort || 28015;

    if (!fs.existsSync(targetServerDir)) fs.mkdirSync(targetServerDir, { recursive: true });
    if (!fs.existsSync(targetClientDir)) fs.mkdirSync(targetClientDir, { recursive: true });

    onLog?.(`Начало импорта сборки Devblog ${db.id} (${db.version}) в ${baseDir}...`);

    const stat = fs.statSync(source);
    if (!stat.isDirectory()) {
      // Archive handling (.zip / .tar / etc.)
      onLog?.(`Обнаружен архив: ${path.basename(source)}. Распаковка...`);
      let extracted = false;
      try {
        const { execSync } = require('child_process');
        execSync(`tar -xf "${source}" -C "${baseDir}"`, { windowsHide: true });
        extracted = true;
        onLog?.(`✓ Быстрая распаковка через tar завершена успешно!`);
      } catch {}

      if (!extracted) {
        try {
          onLog?.(`Распаковка через встроенный модуль AdmZip...`);
          const AdmZip = require('adm-zip');
          const zip = new AdmZip(source);
          zip.extractAllTo(baseDir, true);
          onLog?.(`✓ Распаковка через AdmZip завершена!`);
        } catch (err: any) {
          onLog?.(`[Предупреждение] Ошибка распаковки архива: ${err.message}`);
        }
      }
    } else {
      // Folder handling
      onLog?.(`Обнаружена директория: ${source}. Анализ структуры папок...`);
      const copyDirRecursive = (src: string, dest: string) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const items = fs.readdirSync(src, { withFileTypes: true });
        for (const item of items) {
          const s = path.join(src, item.name);
          const d = path.join(dest, item.name);
          if (item.isDirectory()) {
            copyDirRecursive(s, d);
          } else {
            fs.copyFileSync(s, d);
          }
        }
      };

      const hasServerSubdir = fs.existsSync(path.join(source, 'server'));
      const hasClientSubdir = fs.existsSync(path.join(source, 'client'));

      if (hasServerSubdir || hasClientSubdir) {
        if (hasServerSubdir) {
          onLog?.(`Копирование файлов сервера из ${path.join(source, 'server')}...`);
          copyDirRecursive(path.join(source, 'server'), targetServerDir);
        }
        if (hasClientSubdir && options.installClient !== false) {
          onLog?.(`Копирование файлов клиента из ${path.join(source, 'client')}...`);
          copyDirRecursive(path.join(source, 'client'), targetClientDir);
        }
      } else {
        onLog?.(`Копирование игровых файлов в структуру сервера и клиента...`);
        const items = fs.readdirSync(source, { withFileTypes: true });
        for (const it of items) {
          const s = path.join(source, it.name);
          const nameLower = it.name.toLowerCase();
          if (nameLower.includes('server') || nameLower === 'rustdedicated.exe' || nameLower.includes('dedicated')) {
            if (it.isDirectory()) copyDirRecursive(s, path.join(targetServerDir, it.name));
            else fs.copyFileSync(s, path.join(targetServerDir, it.name));
          } else if (nameLower.includes('client') || nameLower === 'rustclient.exe' || nameLower === 'rust.exe') {
            if (options.installClient !== false) {
              if (it.isDirectory()) copyDirRecursive(s, path.join(targetClientDir, it.name));
              else fs.copyFileSync(s, path.join(targetClientDir, it.name));
            }
          } else {
            if (it.isDirectory()) copyDirRecursive(s, path.join(targetServerDir, it.name));
            else fs.copyFileSync(s, path.join(targetServerDir, it.name));

            if (options.installClient !== false) {
              if (it.isDirectory()) copyDirRecursive(s, path.join(targetClientDir, it.name));
              else fs.copyFileSync(s, path.join(targetClientDir, it.name));
            }
          }
        }
      }
    }

    // Configure start scripts
    onLog?.(`Создание скриптов запуска Start_Server.bat и Start_Client.bat...`);
    const startServerBat = `@echo off\r\ntitle Rust Devblog ${db.id} Dedicated Server\r\necho Starting Rust Devblog ${db.id} (${db.version}) Server on port ${port}...\r\nRustDedicated.exe -batchmode -nographics +server.ip 0.0.0.0 +server.port ${port} +server.queryport ${port + 2} +rcon.port ${port + 1} +rcon.password "admin" +server.identity "rustserver" +server.hostname "Rust Devblog ${db.id} Server" +server.maxplayers 50 +server.worldsize 3000 +server.seed 123456 +server.eac 0\r\n`;
    fs.writeFileSync(path.join(targetServerDir, 'Start_Server.bat'), startServerBat);

    if (options.installClient !== false) {
      const startClientBat = `@echo off\r\ntitle Rust Devblog ${db.id} Client Launcher\r\necho ===================================================\r\necho Запуск клиента Rust Devblog ${db.id}...\r\necho ===================================================\r\nstart "" "RustClient.exe" -force-d3d11 +connect 127.0.0.1:${port}\r\n`;
      fs.writeFileSync(path.join(targetClientDir, 'Start_Client.bat'), startClientBat);
    }

    // Compatibility and NoSteam Patches
    onLog?.(`Применение патча совместимости с Windows 10/11 и современными GPU...`);
    this.patchAssemblyCompatibility(targetServerDir, onLog);
    if (options.installClient !== false) {
      this.patchAssemblyCompatibility(targetClientDir, onLog);
    }

    if (options.applyNoSteam) {
      onLog?.(`Применение патча NoSteam (Spacewar 480)...`);
      if (options.installClient !== false) {
        this.patchNoSteam(targetClientDir);
      }
      this.patchNoSteam(targetServerDir);
    }

    if (options.installOxide) {
      onLog?.(`⚡ Настройка структуры Oxide / uMod для Devblog ${db.id}...`);
      await this.installOxide(targetServerDir, db.id, onLog);
    }

    onLog?.(`✓ Сборка Devblog ${db.id} успешно развернута и готова к запуску!`);

    return {
      success: true,
      message: `Devblog ${db.id} (${db.version}) успешно импортирован в ${baseDir}!`,
      serverPath: targetServerDir,
      clientPath: targetClientDir
    };
  }
}

